import React, { useEffect, useState } from 'react';
import { Search, X, Star, Calendar, Play, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import api, { TVShow, getCachedData, setCachedData } from '@/services/api';
import LoadingBar from '@/components/LoadingBar';
import useAdminSettings from '@/hooks/useAdminSettings';
import TVShowPlayer from '@/components/TVShowPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';

const Shows = () => {
  const navigate = useNavigate();
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
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const { updateProgress } = useWatchHistory();
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailsCache, setShowDetailsCache] = useState<Record<number, TVShow>>({});
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMovieName, setShowMovieName] = useState<number | null>(null);

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent, item: TVShow) => {
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
    
    // Set timeout for slower delay as requested by client
    const timeout = setTimeout(() => {
      setTooltipItem(item);

      // Enrich TV show tooltip with full details if search result is partial
      const needsDetails = (!item.genres || item.genres.length === 0) || !item.number_of_seasons || !item.seasons || item.seasons.length === 0;
      if (needsDetails) {
        const cached = showDetailsCache[item.id];
        if (cached) {
          setTooltipItem(prev => (prev && prev.id === item.id) ? { ...prev, ...cached } as TVShow : prev);
        } else {
          api.getShowDetails(item.id)
            .then(res => {
              const full = res.data as TVShow;
              setShowDetailsCache(prev => ({ ...prev, [item.id]: full }));
              setTooltipItem(prev => (prev && prev.id === item.id) ? { ...prev, ...full } as TVShow : prev);
            })
            .catch(() => {
              // ignore
            });
        }
      }
    }, 600);
    
    setTooltipTimeout(timeout);
  };

  const handleMouseMove = (e: React.MouseEvent, item: TVShow) => {
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

  const handleLongPressStart = (item: TVShow) => {
    if (!isMobile) return;

    const timer = setTimeout(() => {
      // Show show name on long press
      setShowMovieName(item.id);
      // Hide it after 3 seconds
      setTimeout(() => {
        setShowMovieName(null);
      }, 3000);
    }, 500); // 500ms for long press detection

    setLongPressTimer(timer);
  };

  const handleLongPressEnd = (item: TVShow) => {
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

  const fetchShows = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for cached data first
      const cachedTrending = getCachedData('trending_shows');
      const cachedPopular = getCachedData('popular_shows');
      
      let trendingShows, popularShows, topRatedShows;
      
      if (cachedTrending && cachedPopular) {
        // Use cached data for trending and popular, only fetch top_rated
        console.log('🚀 Using cached data for trending and popular shows');
        trendingShows = cachedTrending;
        popularShows = cachedPopular;
        
        const topRated = await api.getTopRatedShows();
        topRatedShows = topRated.data?.results || [];
      } else {
        // Fetch all data if cache is not available
        console.log('🔄 Fetching all show data (no cache available)');
      const [trending, popular, topRated] = await Promise.all([
        api.getTrendingShows(),
        api.getPopularShows(),
        api.getTopRatedShows()
      ]);

        trendingShows = trending.data?.results || [];
        popularShows = popular.data?.results || [];
        topRatedShows = topRated.data?.results || [];
        
        // Cache the data for future use
        setCachedData('trending_shows', trendingShows);
        setCachedData('popular_shows', popularShows);
      }

      setTrendingShows(trendingShows);
      setPopularShows(popularShows);
      setTopRatedShows(topRatedShows);

      // Prefetch details for first few shows for instant modal loading
      setTimeout(() => {
        const showsToPrefetch = [
          ...trendingShows.slice(0, 8),
          ...popularShows.slice(0, 8),
          ...topRatedShows.slice(0, 8)
        ];
        
        console.log(`✅ Loaded ${showsToPrefetch.length} shows with complete details`);
      }, 100);

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

  // Optimized tooltip cleanup - reduced debounce times for faster response
  useEffect(() => {
    let mouseMoveTimeout: NodeJS.Timeout;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      
      // Much faster debounce for immediate response
      mouseMoveTimeout = setTimeout(() => {
        const showsElement = document.querySelector('.shows-container');
        if (showsElement && !showsElement.contains(e.target as Node)) {
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

  const handleShowClick = (show: TVShow) => {
    // Always show modal first
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
      const response = await api.search(query, 'tv');
      let searchResults = response.data?.results || [];
      
      // Filter to only show TV shows
      searchResults = searchResults.filter(item => item.media_type === 'tv');
      
      // Filter out items without poster images
      searchResults = searchResults.filter(item => 
        item.poster_path && item.poster_path !== '' && item.poster_path !== null
      );
      
      setSearchResults(searchResults);
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

  // Progress update handler
  const handleProgressUpdate = (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => {
    if (selectedShow) {
      try {
        updateProgress(
          selectedShow,
          currentTime,
          duration,
          'tv',
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
    <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32 shows-container" style={{ position: 'relative' }}>
      {/* Loading Bar */}
      <LoadingBar isLoading={loading} />
      {/* Mobile Header - Netflix Style */}
      <div className="lg:hidden">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">TV Shows</h1>
              <p className="text-gray-500 text-sm">Explore amazing shows from around the world.</p>
        </div>

        {/* Mobile Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 bg-gray-800/30 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
            />
            {!searchQuery && (
              <div className="absolute left-10 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-gray-400 pointer-events-none">
                <img src="/logo.svg" alt="Cinema.fo" className="h-4 opacity-50" />
                <span className="text-xs font-medium">- TV SHOWS</span>
              </div>
            )}
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
                  {searchResults.slice(0, 6).map((show) => (
                    <div
                      key={show.id}
                      className="cursor-pointer group/item"
                      onClick={() => {
                        handleShowClick(show);
                      }}
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
                        
                        {/* Watchlist Button - Hidden on mobile */}
                        <button
                          onClick={(e) => toggleWatchlist(e, show)}
                          className={`absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-100 z-20 ${isMobile ? 'hidden' : ''}`}
                        >
                          <Bookmark
                            size={16}
                            className={isInWatchlist(show) ? 'fill-blue-500 text-blue-500' : 'text-white'}
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
                        {!isMobile && typeof show.vote_average === 'number' && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                            <Star className="w-3 h-3" />
                            {show.vote_average.toFixed(1)}
                      </div>
                        )}
                        
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 search-result-title ${
                          isMobile
                            ? 'opacity-100' // Always show title on mobile for search results
                            : 'opacity-0 group-hover/item:opacity-100'
                        }`}>
                          <div>
                            <h3 className="text-white font-semibold text-sm line-clamp-2">
                              {getItemTitle(show)}
                        </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <p className="text-gray-500 text-sm">No TV shows found for "{searchQuery}"</p>
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
            <p className="text-xl text-gray-500">Explore amazing shows from around the world.</p>
            </div>

          {/* Desktop Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg rounded-full"
              />
              {!searchQuery && (
                <div className="absolute left-10 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-gray-400 pointer-events-none">
                  <img src="/logo.svg" alt="Cinema.fo" className="h-5 opacity-50" />
                  <span className="text-sm font-medium">- TV SHOWS</span>
                </div>
              )}
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
                                cloudinaryUrl={adminSettings.ads.showsPageAd.cloudinaryUrl}
              clickUrl={adminSettings.ads.showsPageAd.clickUrl}
              enabled={adminSettings.ads.showsPageAd.enabled}
            />
          </div>
        )}

        {/* Shows Content */}
        {!loading && (
          <div className="space-y-8">
                <section>
              {loading && trendingShows.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Trending TV Shows</h2>
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
                  title="Trending TV Shows"
                  items={trendingShows}
                  onItemClick={handleShowClick}
                />
              )}
                </section>

                <section>
              {loading && popularShows.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Popular TV Shows</h2>
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
                  title="Popular TV Shows"
                  items={popularShows}
                  onItemClick={handleShowClick}
                />
              )}
                </section>

                <section>
              {loading && topRatedShows.length === 0 ? (
                <div className="mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 lg:px-0">Top Rated TV Shows</h2>
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
                  title="Top Rated TV Shows"
                  items={topRatedShows}
                  onItemClick={handleShowClick}
                />
              )}
                </section>

            {/* Bottom Ad */}
            {adminSettings?.ads?.showsPageBottomAd?.enabled && (
              <div className="px-4">
                <AdBanner 
                  adKey="showsPageBottomAd" 
                  imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                  cloudinaryUrl={adminSettings.ads.showsPageBottomAd.cloudinaryUrl}
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
                cloudinaryUrl={adminSettings.ads.showsPageAd.cloudinaryUrl}
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
                  {isSearching && <div className="w-5 h-5 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />}
                </div>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                    {searchResults.map((show) => (
                      <div
                        key={show.id}
                        className="cursor-pointer group/item"
                        onClick={(e) => {
                          // Handle both mobile and desktop clicks
                          if (tooltipTimeout) {
                            clearTimeout(tooltipTimeout);
                            setTooltipTimeout(null);
                          }
                          setTooltipItem(null);

                          handleShowClick(show);
                        }}
                        onMouseEnter={isMobile ? undefined : (e) => handleMouseEnter(e, show)}
                        onMouseMove={isMobile ? undefined : (e) => handleMouseMove(e, show)}
                        onMouseLeave={isMobile ? undefined : handleTooltipMouseLeave}
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
                          
                          {/* Watchlist Button - Hidden on mobile */}
                          <button
                            onClick={(e) => toggleWatchlist(e, show)}
                            className={`absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-100 z-20 ${isMobile ? 'hidden' : ''}`}
                          >
                            <Bookmark
                              size={16}
                              className={isInWatchlist(show) ? 'fill-blue-500 text-blue-500' : 'text-white'}
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
                          {!isMobile && typeof show.vote_average === 'number' && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                              <Star className="w-3 h-3" />
                              {show.vote_average.toFixed(1)}
                        </div>
                          )}
                          
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 search-result-title ${
                            isMobile
                              ? 'opacity-100' // Always show title on mobile for search results
                              : 'opacity-0 group-hover/item:opacity-100'
                          }`}>
                            <div>
                                                        <h3 className="text-white font-semibold text-sm line-clamp-2">
                            {getItemTitle(show)}
                          </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <p className="text-gray-500">No TV shows found for "{searchQuery}"</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Shows Content */}
                  {!loading && (
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
                <div className="px-4 mb-8">
          <AdBanner 
            adKey="showsPageBottomAd" 
                imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                cloudinaryUrl={adminSettings.ads.showsPageBottomAd.cloudinaryUrl}
                clickUrl={adminSettings.ads.showsPageBottomAd.clickUrl}
                enabled={adminSettings.ads.showsPageBottomAd.enabled}
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
                
                {tooltipItem.number_of_seasons && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{tooltipItem.number_of_seasons} season{tooltipItem.number_of_seasons !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {tooltipItem.seasons && tooltipItem.seasons.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{tooltipItem.seasons.reduce((total, season) => total + season.episode_count, 0)} episodes</span>
                  </div>
                )}
                
                {/* Description removed as requested */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TV Show Modal */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
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

export default Shows; 