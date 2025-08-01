import React, { useEffect, useState } from 'react';
import { Search, X, Star, Calendar, Play, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import LoadingBar from '@/components/LoadingBar';
import api, { Movie, getCachedData, setCachedData } from '@/services/api';
import useAdminSettings from '@/hooks/useAdminSettings';

const Movies = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { settings: adminSettings } = useAdminSettings();
  const [tooltipItem, setTooltipItem] = useState<Movie | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [watchlistUpdate, setWatchlistUpdate] = useState(0);

  const handleMouseEnter = (e: React.MouseEvent, item: Movie) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial position
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + 10;
    
    // Tooltip dimensions (approximate)
    const tooltipWidth = 320; // max-w-xs = 320px
    const tooltipHeight = 120; // approximate height
    
    // Adjust X position to keep tooltip within viewport
    if (x - tooltipWidth / 2 < 10) {
      // Too close to left edge
      x = tooltipWidth / 2 + 10;
    } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
      // Too close to right edge
      x = viewportWidth - tooltipWidth / 2 - 10;
    }
    
    // Adjust Y position to keep tooltip within viewport
    if (y + tooltipHeight > viewportHeight - 10) {
      // Too close to bottom edge, show above the card
      y = rect.top - tooltipHeight - 10;
      
      // If showing above would also be outside viewport, show at top with margin
      if (y < 10) {
        y = 10;
      }
    }
    
    setTooltipPosition({ x, y });
    
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    const timeout = setTimeout(() => {
      setTooltipItem(item);
    }, 200);
    setTooltipTimeout(timeout);
  };
  const handleTooltipMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
  };

  const hideTooltip = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
  };

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for cached data first
      const cachedTrending = getCachedData('trending_movies');
      const cachedPopular = getCachedData('popular_movies');
      
      let trendingMovies, popularMovies, topRatedMovies;
      
      if (cachedTrending && cachedPopular) {
        // Use cached data for trending and popular, only fetch top-rated
        console.log('🚀 Using cached data for trending and popular movies');
        trendingMovies = cachedTrending;
        popularMovies = cachedPopular;
        
        const topRated = await api.getTopRatedMovies();
        topRatedMovies = topRated.data?.results || [];
      } else {
        // Fetch all data if cache is not available
        console.log('🔄 Fetching all movie data (no cache available)');
        const [trending, popular, topRated] = await Promise.all([
          api.getTrendingMovies(),
          api.getPopularMovies(),
          api.getTopRatedMovies()
        ]);

        trendingMovies = trending.data?.results || [];
        popularMovies = popular.data?.results || [];
        topRatedMovies = topRated.data?.results || [];
        
        // Cache the data for future use
        setCachedData('trending_movies', trendingMovies);
        setCachedData('popular_movies', popularMovies);
      }

      setTrendingMovies(trendingMovies);
      setPopularMovies(popularMovies);
      setTopRatedMovies(topRatedMovies);

      // No need to prefetch since backend now returns complete details
      console.log(`✅ Loaded ${trendingMovies.length + popularMovies.length + topRatedMovies.length} movies with complete details`);

    } catch (error) {
      console.error('Error fetching movies:', error);
      setError('Failed to load movies. Please try again later.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  // Listen for watchlist changes
  useEffect(() => {
    const handleStorageChange = () => {
      setWatchlistUpdate(prev => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Cleanup tooltip on component unmount or when items change
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // If mouse moves outside the movies area, hide tooltip
      const moviesElement = document.querySelector('.movies-container');
      if (moviesElement && !moviesElement.contains(e.target as Node)) {
        hideTooltip();
      }
    };

    const handleVisibilityChange = () => {
      // Hide tooltip when page becomes hidden (user switches tabs)
      if (document.hidden) {
        hideTooltip();
      }
    };

    const handleGlobalClick = () => {
      // Hide tooltip when clicking anywhere
      hideTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hide tooltip on Escape key
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    const handleScroll = () => {
      // Hide tooltip when scrolling
      hideTooltip();
    };

    const handleHideTooltips = () => {
      // Hide tooltip when modal opens
      hideTooltip();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('hideTooltips', handleHideTooltips);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('hideTooltips', handleHideTooltips);
      
      hideTooltip();
    };
  }, [tooltipTimeout, searchResults]);

  const handleMovieClick = (movie: Movie) => {
    // Get current page to pass as 'from' parameter  
    const currentPage = location.pathname + location.search;
    navigate(`/movie-modal/${movie.id}?from=${encodeURIComponent(currentPage)}`);
  };

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.search(query, 'movie');
      let searchResults = response.data?.results || [];
      
      // Filter to only show movies
      searchResults = searchResults.filter(item => item.media_type === 'movie');
      
      setSearchResults(searchResults);
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Watchlist functionality
  const isInWatchlist = (item: Movie): boolean => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      return watchlist.some((watchlistItem: any) => 
        watchlistItem.id === item.id && (watchlistItem.media_type || 'movie') === (item.media_type || 'movie')
      );
    } catch {
      return false;
    }
  };

  const toggleWatchlist = (e: React.MouseEvent, item: Movie) => {
    e.stopPropagation();
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInList = isInWatchlist(item);
      
      if (isInList) {
        const updatedWatchlist = watchlist.filter((watchlistItem: any) => 
          !(watchlistItem.id === item.id && (watchlistItem.media_type || 'movie') === (item.media_type || 'movie'))
        );
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      } else {
        const itemWithType = { ...item, media_type: item.media_type || 'movie' };
        watchlist.push(itemWithType);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
      }
      
      setWatchlistUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };

  const getItemTitle = (item: Movie): string => {
    return item.title || 'Unknown Title';
  };

  const getItemReleaseDate = (item: Movie): string => {
    return item.release_date || '';
  };

  const formatReleaseDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') {
      return 'Unknown';
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Unknown' : date.getFullYear().toString();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
            Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 sm:pt-20 md:pt-20 movies-container" style={{ position: 'relative' }}>
      {/* Loading Bar */}
      <LoadingBar isLoading={loading} />
      {/* Mobile Header - Netflix Style */}
      <div className="lg:hidden">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">Movies</h1>
          <p className="text-gray-400 text-sm">Discover amazing movies from around the world</p>
        </div>

        {/* Mobile Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 bg-gray-800/30 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            />
            {searchQuery && (
          <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Results */}
        {searchQuery && (
          <div className="px-4 mb-4">
            <div className="bg-black rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">
                  Search Results for "{searchQuery}"
                </h3>
                {isSearching && <div className="w-4 h-4 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />}
              </div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.slice(0, 6).map((movie) => (
                    <div
                      key={movie.id}
                      className="cursor-pointer group/item"
                      onClick={() => handleMovieClick(movie)}
                >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                        <img
                          src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                          alt={getItemTitle(movie)}
                          className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                          }}
                        />
                        
                        {/* Watchlist Button */}
                        <button
                          onClick={(e) => toggleWatchlist(e, movie)}
                          className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                        >
                          <Bookmark 
                            size={16} 
                            className={isInWatchlist(movie) ? 'fill-blue-500 text-blue-500' : 'text-white'} 
                          />
                        </button>

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                          <div className="crystal-play-button">
                            {/* Triangle is created via CSS ::before pseudo-element */}
                          </div>
                        </div>
                        
                        {/* Rating Badge */}
                        {typeof movie.vote_average === 'number' && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                            <Star className="w-3 h-3" />
                            {movie.vote_average.toFixed(1)}
                      </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <div>
                            <h3 className="text-white font-semibold text-sm line-clamp-2">
                              {getItemTitle(movie)}
                        </h3>
                            <p className="text-gray-300 text-xs mt-1">
                              {formatReleaseDate(getItemReleaseDate(movie))}
                        </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <p className="text-gray-400 text-sm">No movies found for "{searchQuery}"</p>
              ) : null}
            </div>
          </div>
        )}
          </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Movies</h1>
            <p className="text-xl text-gray-400">Discover amazing movies from around the world</p>
            </div>

          {/* Desktop Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 text-lg"
              />
              {searchQuery && (
                  <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                  <X className="w-5 h-5" />
                  </button>
              )}
              </div>
            </div>
        </div>
      </div>

      {/* Mobile Content - Netflix Style */}
      <div className="lg:hidden">
        {/* Top Ad */}
        {adminSettings?.ads?.moviesPageAd?.enabled && (
          <div className="px-4 mb-6">
            <AdBanner 
              adKey="moviesPageAd"
              imageUrl={adminSettings.ads.moviesPageAd.imageUrl}
              clickUrl={adminSettings.ads.moviesPageAd.clickUrl}
              enabled={adminSettings.ads.moviesPageAd.enabled}
            />
          </div>
        )}

        {/* Movies Content */}
        {!loading && (
          <div className="space-y-8">
                <section>
              <MovieCarousel 
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleMovieClick}
              />
            </section>

                <section>
              <MovieCarousel 
                title="Popular Movies"
                items={popularMovies}
                onItemClick={handleMovieClick}
              />
            </section>

                <section>
              <MovieCarousel 
                title="Top Rated Movies"
                items={topRatedMovies}
                onItemClick={handleMovieClick}
              />
            </section>

            {/* Bottom Ad */}
            {adminSettings?.ads?.moviesPageBottomAd?.enabled && (
              <div className="px-4">
                <AdBanner 
                  adKey="moviesPageBottomAd"
                  imageUrl={adminSettings.ads.moviesPageBottomAd.imageUrl}
                  clickUrl={adminSettings.ads.moviesPageBottomAd.clickUrl}
                  enabled={adminSettings.ads.moviesPageBottomAd.enabled}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Content */}
      <div className="hidden lg:block">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          {/* Top Ad */}
          {adminSettings?.ads?.moviesPageAd?.enabled && (
            <div className="mb-8">
              <AdBanner 
                adKey="moviesPageAd"
                imageUrl={adminSettings.ads.moviesPageAd.imageUrl}
                clickUrl={adminSettings.ads.moviesPageAd.clickUrl}
                enabled={adminSettings.ads.moviesPageAd.enabled}
              />
            </div>
          )}

          {/* Desktop Search Results */}
          {searchQuery && (
            <div className="mb-8">
              <div className="bg-black rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-xl font-semibold">
                    Search Results for "{searchQuery}"
                  </h3>
                  {isSearching && <div className="w-5 h-5 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />}
                </div>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        className="cursor-pointer group/item"
                        onClick={() => handleMovieClick(movie)}
                        onMouseEnter={(e) => handleMouseEnter(e, movie)}
                        onMouseLeave={handleTooltipMouseLeave}
                        onMouseOut={handleTooltipMouseLeave}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                          <img
                            src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                            alt={getItemTitle(movie)}
                            className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                            }}
                          />
                          
                          {/* Watchlist Button */}
                          <button
                            onClick={(e) => toggleWatchlist(e, movie)}
                            className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                          >
                            <Bookmark 
                              size={16} 
                              className={isInWatchlist(movie) ? 'fill-blue-500 text-blue-500' : 'text-white'} 
                            />
                          </button>

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                            <div className="crystal-play-button">
                              {/* Triangle is created via CSS ::before pseudo-element */}
                            </div>
                          </div>
                          
                          {/* Rating Badge */}
                          {typeof movie.vote_average === 'number' && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                              <Star className="w-3 h-3" />
                              {movie.vote_average.toFixed(1)}
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <div>
                              <h3 className="text-white font-semibold text-sm line-clamp-2">
                                {getItemTitle(movie)}
                              </h3>
                              <p className="text-gray-300 text-xs mt-1">
                                {formatReleaseDate(getItemReleaseDate(movie))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <p className="text-gray-400">No movies found for "{searchQuery}"</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Movies Content */}
                  {!loading && (
            <div className="space-y-8">
              <section>
                    <MovieCarousel 
                      title="Trending Movies"
                      items={trendingMovies}
                      onItemClick={handleMovieClick}
                    />
                  </section>

              <section>
                    <MovieCarousel 
                      title="Popular Movies"
                      items={popularMovies}
                      onItemClick={handleMovieClick}
                    />
                  </section>

              <section>
                    <MovieCarousel 
                      title="Top Rated Movies"
                      items={topRatedMovies}
                      onItemClick={handleMovieClick}
              />
            </section>

        {/* Bottom Ad */}
          {adminSettings?.ads?.moviesPageBottomAd?.enabled && (
                <div className="mb-8">
          <AdBanner 
            adKey="moviesPageBottomAd" 
                imageUrl={adminSettings.ads.moviesPageBottomAd.imageUrl}
                clickUrl={adminSettings.ads.moviesPageBottomAd.clickUrl}
                enabled={adminSettings.ads.moviesPageBottomAd.enabled}
              />
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Tooltip */}
      {tooltipItem && (
        <div
          className="fixed z-50 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl p-4 max-w-xs pointer-events-none"
        style={{ 
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%)',
            marginTop: '0px'
          }}
        >
          <div className="flex items-start gap-3">
            {/* Poster */}
            <div className="flex-shrink-0 w-16 h-24 bg-gray-700 rounded overflow-hidden">
              <img
                src={tooltipItem.poster_path ? `https://image.tmdb.org/t/p/w92${tooltipItem.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjQ2IiB5PSI2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg=='}
                alt={getItemTitle(tooltipItem)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjQ2IiB5PSI2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg==';
                }}
                />
                  </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-semibold text-sm line-clamp-2 mb-2">
                {getItemTitle(tooltipItem)}
          </h4>
              
              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatReleaseDate(getItemReleaseDate(tooltipItem))}</span>
                </div>
                
                {typeof tooltipItem.vote_average === 'number' && (
                  <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400" />
                    <span>{tooltipItem.vote_average.toFixed(1)}</span>
                  </div>
                )}
                
                {tooltipItem.overview && (
                  <p className="text-gray-400 line-clamp-2 mt-2">
                    {tooltipItem.overview}
                  </p>
                )}
                
                {tooltipItem.cast && tooltipItem.cast.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-xs">
                      <span className="text-gray-500">Cast:</span> {tooltipItem.cast.slice(0, 3).map(actor => actor.name).join(', ')}
                      {tooltipItem.cast.length > 3 && '...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Movies; 