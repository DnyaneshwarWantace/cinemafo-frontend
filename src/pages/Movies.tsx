import React, { useEffect, useState } from 'react';
import { Search, X, Star, Calendar, Play, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import LoadingBar from '@/components/LoadingBar';
import api, { Movie, getCachedData, setCachedData } from '@/services/api';
import useAdminSettings from '@/hooks/useAdminSettings';
import MovieModal from '@/components/MovieModal';
import { useWatchHistory } from '@/hooks/useWatchHistory';

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
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const { updateProgress } = useWatchHistory();
  const [isMobile, setIsMobile] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMovieName, setShowMovieName] = useState<number | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, item: Movie) => {
    // Don't show tooltips on mobile devices
    if (isMobile) {
      return;
    }

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
    
    // Preload tooltip image for faster display
    if (item.poster_path) {
      const img = new Image();
      img.src = `https://image.tmdb.org/t/p/w92${item.poster_path}`;
    }
    
    // Clear any existing timeout and hide current tooltip immediately
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    
    // Hide current tooltip immediately when moving to new item
    setTooltipItem(null);
    
    // Set timeout for slightly slower delay
    const timeout = setTimeout(() => {
      setTooltipItem(item);
    }, 400);
    
    setTooltipTimeout(timeout);
  };

  const handleMouseMove = (e: React.MouseEvent, item: Movie) => {
    // Don't show tooltips on mobile devices
    if (isMobile) {
      return;
    }

    // If we're already showing a tooltip for this item, don't do anything
    if (tooltipItem && tooltipItem.id === item.id) {
      return;
    }

    // If we're moving to a different item, handle it like a new mouse enter
    if (!tooltipItem || tooltipItem.id !== item.id) {
      handleMouseEnter(e, item);
    }
  };

  const handleTooltipMouseLeave = () => {
    // Clear any existing timeout immediately
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    // Hide tooltip immediately for better responsiveness
    setTooltipItem(null);
  };

  const hideTooltip = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
  };

  const handleLongPressStart = (item: Movie) => {
    if (!isMobile) return;

    const timer = setTimeout(() => {
      // Show movie name on long press
      setShowMovieName(item.id);
      // Hide it after 3 seconds
      setTimeout(() => {
        setShowMovieName(null);
      }, 3000);
    }, 500); // 500ms for long press detection

    setLongPressTimer(timer);
  };

  const handleLongPressEnd = (item: Movie) => {
    if (!isMobile) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Don't handle opening here - let onClick handle it always
  };

  const handleLongPressCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
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
        // Use cached data for trending and popular, only fetch top_rated
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

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Optimized tooltip cleanup - reduced debounce times for faster response
  useEffect(() => {
    let mouseMoveTimeout: NodeJS.Timeout;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      
      // Much faster debounce for immediate response
      mouseMoveTimeout = setTimeout(() => {
        const moviesElement = document.querySelector('.movies-container');
        if (moviesElement && !moviesElement.contains(e.target as Node)) {
          hideTooltip();
        }
      }, 10); // Reduced from 50ms to 10ms
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideTooltip();
      }
    };

    const handleFocus = () => {
      // Clear tooltips when window regains focus (e.g., returning from video player)
      hideTooltip();
    };

    const handleGlobalClick = () => {
      hideTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    // Optimized scroll handler
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        hideTooltip();
      }, 20); // Reduced from 100ms to 20ms
    };

    const handleHideTooltips = () => {
      hideTooltip();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('hideTooltips', handleHideTooltips);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('hideTooltips', handleHideTooltips);
      window.removeEventListener('focus', handleFocus);
      
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Clean up long press timers
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }

      hideTooltip();
    };
  }, [tooltipTimeout, searchResults]);

  // Clear tooltips when component mounts (e.g., returning from video player)
  useEffect(() => {
    hideTooltip();
  }, []);

  const handleMovieClick = (movie: Movie) => {
    // Always show modal first
    setSelectedMovie(movie);
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
      
      // Filter out items without poster images
      searchResults = searchResults.filter(item => 
        item.poster_path && item.poster_path !== '' && item.poster_path !== null
      );
      
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

  // Progress update handler
  const handleProgressUpdate = (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => {
    if (selectedMovie) {
      try {
        updateProgress(
          selectedMovie,
          currentTime,
          duration,
          'movie',
          undefined,
          undefined,
          undefined,
          videoElement
        );
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }
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
    <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32 movies-container" style={{ position: 'relative' }}>
      {/* Loading Bar */}
      <LoadingBar isLoading={loading} />
      {/* Mobile Header - Netflix Style */}
      <div className="lg:hidden">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">Movies</h1>
                      <p className="text-gray-500 text-sm">Explore amazing movies from around the world.</p>
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
                      onClick={() => {
                        // Handle both mobile and desktop clicks
                        if (isMobile && showMovieName === movie.id) {
                          setShowMovieName(null);
                        }
                        handleMovieClick(movie);
                      }}
                      onTouchStart={isMobile ? (e) => {
                        // Don't prevent default to allow normal click behavior
                        handleLongPressStart(movie);
                      } : undefined}
                      onTouchEnd={isMobile ? (e) => {
                        // Don't prevent default - let onClick handle it
                        handleLongPressEnd(movie);
                      } : undefined}
                      onTouchMove={isMobile ? handleLongPressCancel : undefined}
                      onTouchCancel={isMobile ? handleLongPressCancel : undefined}
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
                        
                        {/* Watchlist Button - Hidden on mobile */}
                        <button
                          onClick={(e) => toggleWatchlist(e, movie)}
                          className={`absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-100 z-20 ${isMobile ? 'hidden' : ''}`}
                        >
                          <Bookmark
                            size={16}
                            className={isInWatchlist(movie) ? 'fill-blue-500 text-blue-500' : 'text-white'}
                          />
                        </button>

                        {/* Play Button Overlay - Hidden on mobile */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 hidden md:flex">
                          <img 
                            src="/playbutton.svg" 
                            alt="Play" 
                            className="w-16 h-16 drop-shadow-2xl filter brightness-110"
                          />
                        </div>
                        
                        {/* Rating Badge - Hidden on mobile */}
                        {!isMobile && typeof movie.vote_average === 'number' && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                            <Star className="w-3 h-3" />
                            {movie.vote_average.toFixed(1)}
                      </div>
                        )}
                        
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 search-result-title ${
                          isMobile
                            ? 'opacity-100' // Always show title on mobile for search results
                            : 'opacity-0 group-hover/item:opacity-100'
                        }`}>
                          <div>
                            <h3 className="text-white font-semibold text-sm line-clamp-2">
                              {getItemTitle(movie)}
                        </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <p className="text-gray-500 text-sm">No movies found for "{searchQuery}"</p>
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
            <p className="text-xl text-gray-500">Explore amazing movies from around the world.</p>
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
                className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg rounded-full"
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
              cloudinaryUrl={adminSettings.ads.moviesPageAd.cloudinaryUrl}
              clickUrl={adminSettings.ads.moviesPageAd.clickUrl}
              enabled={adminSettings.ads.moviesPageAd.enabled}
            />
          </div>
        )}

        {/* Movies Content */}
        {!loading && (
          <div className="space-y-8">
                <section>
              {loading && trendingMovies.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Trending Movies</h2>
                  <div className="flex gap-4 overflow-x-auto px-4 lg:px-0">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex-none w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px]">
                        <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <MovieCarousel 
                  title="Trending Movies"
                  items={trendingMovies}
                  onItemClick={handleMovieClick}
                />
              )}
            </section>

                <section>
              {loading && popularMovies.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Popular Movies</h2>
                  <div className="flex gap-4 overflow-x-auto px-4 lg:px-0">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex-none w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px]">
                        <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <MovieCarousel 
                  title="Popular Movies"
                  items={popularMovies}
                  onItemClick={handleMovieClick}
                />
              )}
            </section>

                <section>
              {loading && topRatedMovies.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Top Rated Movies</h2>
                  <div className="flex gap-4 overflow-x-auto px-4 lg:px-0">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex-none w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px]">
                        <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <MovieCarousel 
                  title="Top Rated Movies"
                  items={topRatedMovies}
                  onItemClick={handleMovieClick}
                />
              )}
            </section>

            {/* Bottom Ad */}
            {adminSettings?.ads?.moviesPageBottomAd?.enabled && (
              <div className="px-4">
                <AdBanner 
                  adKey="moviesPageBottomAd"
                  imageUrl={adminSettings.ads.moviesPageBottomAd.imageUrl}
                  cloudinaryUrl={adminSettings.ads.moviesPageBottomAd.cloudinaryUrl}
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
                cloudinaryUrl={adminSettings.ads.moviesPageAd.cloudinaryUrl}
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
                          onClick={(e) => {
                            // Handle both mobile and desktop clicks
                            if (tooltipTimeout) {
                              clearTimeout(tooltipTimeout);
                              setTooltipTimeout(null);
                            }
                            setTooltipItem(null);

                            // On mobile, if name is showing, hide it and open movie
                            if (isMobile && showMovieName === movie.id) {
                              setShowMovieName(null);
                            }

                            handleMovieClick(movie);
                          }}
                          onMouseEnter={isMobile ? undefined : (e) => handleMouseEnter(e, movie)}
                          onMouseMove={isMobile ? undefined : (e) => handleMouseMove(e, movie)}
                          onMouseLeave={isMobile ? undefined : handleTooltipMouseLeave}
                          onTouchStart={isMobile ? (e) => {
                            // Don't prevent default to allow normal click behavior
                            handleLongPressStart(movie);
                          } : undefined}
                          onTouchEnd={isMobile ? (e) => {
                            // Don't prevent default - let onClick handle it
                            handleLongPressEnd(movie);
                          } : undefined}
                          onTouchMove={isMobile ? handleLongPressCancel : undefined}
                          onTouchCancel={isMobile ? handleLongPressCancel : undefined}
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
                          
                          {/* Watchlist Button - Hidden on mobile */}
                          <button
                            onClick={(e) => toggleWatchlist(e, movie)}
                            className={`absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-100 z-20 ${isMobile ? 'hidden' : ''}`}
                          >
                            <Bookmark
                              size={16}
                              className={isInWatchlist(movie) ? 'fill-blue-500 text-blue-500' : 'text-white'}
                            />
                          </button>

                          {/* Play Button Overlay - Hidden on mobile */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 hidden md:flex">
                            <img 
                              src="/playbutton.svg" 
                              alt="Play" 
                              className="w-16 h-16 drop-shadow-2xl filter brightness-110"
                            />
                          </div>
                          
                          {/* Rating Badge - Hidden on mobile */}
                          {!isMobile && typeof movie.vote_average === 'number' && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                              <Star className="w-3 h-3" />
                              {movie.vote_average.toFixed(1)}
                        </div>
                          )}
                          
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 search-result-title ${
                            isMobile
                              ? 'opacity-100' // Always show title on mobile for search results
                              : 'opacity-0 group-hover/item:opacity-100'
                          }`}>
                            <div>
                              <h3 className="text-white font-semibold text-sm line-clamp-2">
                                {getItemTitle(movie)}
                          </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <p className="text-gray-500">No movies found for "{searchQuery}"</p>
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
                <div className="px-4 mb-8">
          <AdBanner 
            adKey="moviesPageBottomAd" 
                imageUrl={adminSettings.ads.moviesPageBottomAd.imageUrl}
                cloudinaryUrl={adminSettings.ads.moviesPageBottomAd.cloudinaryUrl}
                clickUrl={adminSettings.ads.moviesPageBottomAd.clickUrl}
                enabled={adminSettings.ads.moviesPageBottomAd.enabled}
              />
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Tooltip - Hidden on mobile */}
      {tooltipItem && !isMobile && (
        <div
          className="fixed z-[9998] bg-black/95 backdrop-blur-xl border border-blue-500/50 rounded-lg shadow-2xl p-4 max-w-xs pointer-events-none hidden md:block"
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
                width={92}
                height={138}
                decoding="async"
                fetchPriority="high"
                loading="eager"
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
                  <span className="text-blue-400">•</span>
                  <span>{formatReleaseDate(getItemReleaseDate(tooltipItem))}</span>
                </div>
                
                {tooltipItem.genres && tooltipItem.genres.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{tooltipItem.genres.slice(0, 2).map(g => g.name).join(', ')}</span>
                  </div>
                )}
                
                {tooltipItem.runtime && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{Math.floor(tooltipItem.runtime / 60)}h {tooltipItem.runtime % 60}m</span>
                  </div>
                )}
                
                {/* Description removed as requested */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          /* Disable hover effects on touch devices */
          @media (hover: none) and (pointer: coarse) {
            .group\\/item:hover .group-hover\\/item\\:scale-105 {
              transform: none !important;
            }
            .group\\/item:hover .group-hover\\/item\\:opacity-100 {
              opacity: 0 !important;
            }
            /* Always show search result titles on mobile */
            .search-result-title {
              opacity: 1 !important;
            }
          }
        `
      }} />
    </div>
  );
};

export default Movies; 