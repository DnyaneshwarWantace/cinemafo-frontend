import React, { useEffect, useState } from 'react';
import { Search, X, Star, Calendar, Play, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TVShowPlayer from '@/components/TVShowPlayer';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import api, { TVShow } from '@/services/api';
import { Loader2 } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const Shows = () => {
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [topRatedShows, setTopRatedShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TVShow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { settings: adminSettings } = useAdminSettings();
  const [tooltipItem, setTooltipItem] = useState<TVShow | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [watchlistUpdate, setWatchlistUpdate] = useState(0);

  const handleMouseEnter = (e: React.MouseEvent, item: TVShow) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    const timeout = setTimeout(() => {
      setTooltipItem(item);
    }, 800);
    setTooltipTimeout(timeout);
  };
  const handleTooltipMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
  };

  const fetchShows = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trending, popular, topRated] = await Promise.all([
        api.getTrendingShows(),
        api.getPopularShows(),
        api.getTopRatedShows()
      ]);

      setTrendingShows(trending.data?.results || []);
      setPopularShows(popular.data?.results || []);
      setTopRatedShows(topRated.data?.results || []);
    } catch (error) {
      console.error('Error fetching shows:', error);
      setError('Failed to load shows. Please try again later.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShows();
  }, []);

  // Listen for watchlist changes
  useEffect(() => {
    const handleStorageChange = () => {
      setWatchlistUpdate(prev => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleShowClick = (show: TVShow) => {
    setSelectedShow(show);
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
      const response = await api.search(query);
      setSearchResults(response.data?.results || []);
    } catch (error) {
      console.error('Error searching shows:', error);
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
  const isInWatchlist = (item: TVShow): boolean => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      return watchlist.some((watchlistItem: any) => 
        watchlistItem.id === item.id && (watchlistItem.media_type || 'tv') === (item.media_type || 'tv')
      );
    } catch {
      return false;
    }
  };

  const toggleWatchlist = (e: React.MouseEvent, item: TVShow) => {
    e.stopPropagation();
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInList = isInWatchlist(item);
      
      if (isInList) {
        const updatedWatchlist = watchlist.filter((watchlistItem: any) => 
          !(watchlistItem.id === item.id && (watchlistItem.media_type || 'tv') === (item.media_type || 'tv'))
        );
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      } else {
        const itemWithType = { ...item, media_type: item.media_type || 'tv' };
        watchlist.push(itemWithType);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
      }
      
      setWatchlistUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };

  const getItemTitle = (item: TVShow): string => {
    return item.name || 'Unknown Title';
  };

  const getItemReleaseDate = (item: TVShow): string => {
    return item.first_air_date || '';
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
    <div className="min-h-screen bg-black pt-20 sm:pt-20 md:pt-20" style={{ position: 'relative' }}>
      {/* Mobile Header - Netflix Style */}
      <div className="lg:hidden">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">TV Shows</h1>
          <p className="text-gray-400 text-sm">Discover amazing TV shows from around the world</p>
        </div>

        {/* Mobile Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search TV shows..."
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
                {isSearching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
              </div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.slice(0, 6).map((show) => (
                    <div
                      key={show.id}
                      className="cursor-pointer group/item"
                      onClick={() => handleShowClick(show)}
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                        <img
                          src={show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                          alt={getItemTitle(show)}
                          className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                          }}
                        />
                        
                        {/* Watchlist Button */}
                        <button
                          onClick={(e) => toggleWatchlist(e, show)}
                          className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                        >
                          <Bookmark 
                            size={16} 
                            className={isInWatchlist(show) ? 'fill-blue-500 text-blue-500' : 'text-white'} 
                          />
                        </button>

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                          <div className="crystal-play-button">
                            {/* Triangle is created via CSS ::before pseudo-element */}
                          </div>
                        </div>
                        
                        {/* Rating Badge */}
                        {typeof show.vote_average === 'number' && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                            <Star className="w-3 h-3" />
                            {show.vote_average.toFixed(1)}
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <div>
                            <h3 className="text-white font-semibold text-sm line-clamp-2">
                              {getItemTitle(show)}
                            </h3>
                            <p className="text-gray-300 text-xs mt-1">
                              {formatReleaseDate(getItemReleaseDate(show))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <p className="text-gray-400 text-sm">No TV shows found for "{searchQuery}"</p>
              ) : null}
            </div>
          </div>
        )}
          </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TV Shows</h1>
            <p className="text-xl text-gray-400">Discover amazing TV shows from around the world</p>
            </div>

          {/* Desktop Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search TV shows..."
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
        {adminSettings?.ads?.showsPageAd?.enabled && (
          <div className="px-4 mb-6">
            <AdBanner 
              adKey="showsPageAd" 
              imageUrl={adminSettings.ads.showsPageAd.imageUrl}
              clickUrl={adminSettings.ads.showsPageAd.clickUrl}
              enabled={adminSettings.ads.showsPageAd.enabled}
            />
          </div>
        )}

        {/* Shows Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
                <section>
              <MovieCarousel
                    title="Trending TV Shows"
                    items={trendingShows}
                onItemClick={handleShowClick}
              />
                </section>

                <section>
              <MovieCarousel
                    title="Popular TV Shows"
                    items={popularShows}
                onItemClick={handleShowClick}
              />
                </section>

                <section>
              <MovieCarousel
                    title="Top Rated TV Shows"
                    items={topRatedShows}
                onItemClick={handleShowClick}
              />
                </section>

            {/* Bottom Ad */}
            {adminSettings?.ads?.showsPageBottomAd?.enabled && (
              <div className="px-4">
                <AdBanner 
                  adKey="showsPageBottomAd" 
                  imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                  clickUrl={adminSettings.ads.showsPageBottomAd.clickUrl}
                  enabled={adminSettings.ads.showsPageBottomAd.enabled}
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
          {adminSettings?.ads?.showsPageAd?.enabled && (
            <div className="mb-8">
              <AdBanner 
                adKey="showsPageAd" 
                imageUrl={adminSettings.ads.showsPageAd.imageUrl}
                clickUrl={adminSettings.ads.showsPageAd.clickUrl}
                enabled={adminSettings.ads.showsPageAd.enabled}
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
                  {isSearching && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                </div>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                    {searchResults.map((show) => (
                      <div
                        key={show.id}
                        className="cursor-pointer group/item"
                        onClick={() => handleShowClick(show)}
                        onMouseEnter={(e) => handleMouseEnter(e, show)}
                        onMouseLeave={handleTooltipMouseLeave}
                        onMouseOut={handleTooltipMouseLeave}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                          <img
                            src={show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                            alt={getItemTitle(show)}
                            className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                            }}
                          />
                          
                          {/* Watchlist Button */}
                          <button
                            onClick={(e) => toggleWatchlist(e, show)}
                            className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                          >
                            <Bookmark 
                              size={16} 
                              className={isInWatchlist(show) ? 'fill-blue-500 text-blue-500' : 'text-white'} 
                            />
                          </button>

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                            <div className="crystal-play-button">
                              {/* Triangle is created via CSS ::before pseudo-element */}
                            </div>
                          </div>
                          
                          {/* Rating Badge */}
                          {typeof show.vote_average === 'number' && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                              <Star className="w-3 h-3" />
                              {show.vote_average.toFixed(1)}
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <div>
                              <h3 className="text-white font-semibold text-sm line-clamp-2">
                                {getItemTitle(show)}
                              </h3>
                              <p className="text-gray-300 text-xs mt-1">
                                {formatReleaseDate(getItemReleaseDate(show))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <p className="text-gray-400">No TV shows found for "{searchQuery}"</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Shows Content */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                    <MovieCarousel
                      title="Trending TV Shows"
                      items={trendingShows}
                      onItemClick={handleShowClick}
                    />
                  </section>

              <section>
                    <MovieCarousel
                      title="Popular TV Shows"
                      items={popularShows}
                      onItemClick={handleShowClick}
                    />
                  </section>

              <section>
                    <MovieCarousel
                      title="Top Rated TV Shows"
                      items={topRatedShows}
                      onItemClick={handleShowClick}
              />
                </section>

        {/* Bottom Ad */}
          {adminSettings?.ads?.showsPageBottomAd?.enabled && (
                <div className="mb-8">
          <AdBanner 
            adKey="showsPageBottomAd" 
                imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                clickUrl={adminSettings.ads.showsPageBottomAd.clickUrl}
                enabled={adminSettings.ads.showsPageBottomAd.enabled}
          />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TV Show Modal */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}

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
              </div>
            </div>
          </div>
          </div>
        )}
    </div>
  );
};

export default Shows; 