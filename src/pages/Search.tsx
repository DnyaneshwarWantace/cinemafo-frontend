import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, X, Star, Calendar, TrendingUp, Play, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';
import AdBanner from '@/components/AdBanner';
import api, { Movie, TVShow } from '@/services/api';
import { Loader2 } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWatchHistory } from '@/hooks/useWatchHistory';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [mediaType, setMediaType] = useState('multi');
  const [tooltipItem, setTooltipItem] = useState<Movie | TVShow | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState({
    genre: 'all',
    year: '',
    rating: 'any',
    sortBy: 'relevance'
  });
  const [showExtendedFilters, setShowExtendedFilters] = useState(false);
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

  // Read query from URL on component mount
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(decodeURIComponent(urlQuery));
    }
  }, [searchParams]);

  // Clear any lingering tooltip state when Search component mounts
  useEffect(() => {
    // Dispatch a custom event to hide tooltips globally
    window.dispatchEvent(new CustomEvent('hideSearchTooltips'));
    
    // Also clear any local tooltip state
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
    
    // Cleanup function to ensure tooltips are hidden when component unmounts
    return () => {
      window.dispatchEvent(new CustomEvent('hideSearchTooltips'));
    };
  }, []); // Empty dependency array - runs only on mount and unmount

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, mediaType, filters]);

  // Optimized tooltip cleanup - reduced debounce times for faster response
  useEffect(() => {
    let mouseMoveTimeout: NodeJS.Timeout;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      
      // Much faster debounce for immediate response
      mouseMoveTimeout = setTimeout(() => {
        // Only hide tooltip if mouse is not over any movie card
        const movieCards = document.querySelectorAll('[data-movie-card]');
        let isOverCard = false;
        
        movieCards.forEach(card => {
          if (card.contains(e.target as Node)) {
            isOverCard = true;
          }
        });
        
        if (!isOverCard) {
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
  }, [tooltipTimeout, results]);

  // Clear tooltips when component mounts (e.g., returning from video player)
  useEffect(() => {
    hideTooltip();
  }, []);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.search(query, mediaType);
      let searchResults = response.data?.results || [];
      
      // Apply filters
      if (filters.year) {
        searchResults = searchResults.filter(item => {
          const releaseDate = item.release_date || item.first_air_date;
          return releaseDate && new Date(releaseDate).getFullYear().toString() === filters.year;
        });
      }
      
      if (filters.rating && filters.rating !== 'any') {
        searchResults = searchResults.filter(item => 
          item.vote_average >= parseFloat(filters.rating)
        );
      }
      
      // Apply sorting
      switch (filters.sortBy) {
        case 'rating':
          searchResults.sort((a, b) => b.vote_average - a.vote_average);
          break;
        case 'date':
          searchResults.sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0);
            const dateB = new Date(b.release_date || b.first_air_date || 0);
            return dateB.getTime() - dateA.getTime();
          });
          break;
        case 'title':
          searchResults.sort((a, b) => {
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            return titleA.localeCompare(titleB);
          });
          break;
        default:
          // Relevance - keep original order
          break;
      }
      
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      } finally {
        setLoading(false);
      }
    };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setFilters({
      genre: 'all',
      year: '',
      rating: '',
      sortBy: 'relevance'
    });
  };

  const handleItemClick = (item: Movie | TVShow) => {
    // Always show modal first
    setSelectedItem(item);
  };

  const clearFilters = () => {
    setFilters({
      genre: 'all',
      year: '',
      rating: '',
      sortBy: 'relevance'
    });
  };

  // Tooltip functions
  const handleMouseEnter = (e: React.MouseEvent, item: Movie | TVShow) => {
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

      // If it's a TV show and fields are missing, fetch details
      if ('name' in item) {
        const tv = item as TVShow;
        const needsDetails = (!tv.genres || tv.genres.length === 0) || !tv.number_of_seasons || !tv.seasons || tv.seasons.length === 0;
        if (needsDetails) {
          const cached = showDetailsCache[tv.id];
          if (cached) {
            setTooltipItem(prev => (prev && prev.id === tv.id) ? { ...prev, ...cached } as TVShow : prev);
          } else {
            api.getShowDetails(tv.id)
              .then(res => {
                const full = res.data as TVShow;
                setShowDetailsCache(prev => ({ ...prev, [tv.id]: full }));
                setTooltipItem(prev => (prev && prev.id === tv.id) ? { ...prev, ...full } as TVShow : prev);
              })
              .catch(() => {
                // ignore
              });
          }
        }
      }
    }, 400);
    
    setTooltipTimeout(timeout);
  };

  const handleMouseMove = (e: React.MouseEvent, item: Movie | TVShow) => {
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
    // Clear timeout and hide tooltip immediately
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

  const handleLongPressStart = (item: Movie | TVShow) => {
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

  const handleLongPressEnd = (item: Movie | TVShow) => {
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

  // Watchlist functions
  const isInWatchlist = (item: Movie | TVShow): boolean => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      return watchlist.some((watchlistItem: any) => watchlistItem.id === item.id);
    } catch (error) {
      return false;
    }
  };

  const toggleWatchlist = (e: React.MouseEvent, item: Movie | TVShow) => {
    e.stopPropagation();
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInList = watchlist.some((watchlistItem: any) => watchlistItem.id === item.id);
      
      if (isInList) {
        // Remove from watchlist
        const updatedWatchlist = watchlist.filter((watchlistItem: any) => watchlistItem.id !== item.id);
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      } else {
        // Add to watchlist
        const itemToAdd = {
          id: item.id,
          title: 'title' in item ? item.title : item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          release_date: 'release_date' in item ? item.release_date : item.first_air_date,
          vote_average: item.vote_average,
          overview: item.overview,
          media_type: 'title' in item ? 'movie' : 'tv'
        };
        watchlist.push(itemToAdd);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
      }
      
      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  // Progress update handler
  const handleProgressUpdate = (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => {
    if (selectedItem) {
      try {
        updateProgress(
          selectedItem,
          currentTime,
          duration,
          'title' in selectedItem ? 'movie' : 'tv',
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

  // Helper functions
  const getItemTitle = (item: Movie | TVShow): string => {
    return 'title' in item ? item.title : item.name;
  };

  const getItemReleaseDate = (item: Movie | TVShow): string => {
    return 'release_date' in item ? item.release_date : item.first_air_date;
  };

  const formatReleaseDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Unknown' : date.getFullYear().toString();
  };

  const hasActiveFilters = filters.genre !== 'all' || filters.year || filters.rating || filters.sortBy !== 'relevance';
  const { settings: adminSettings } = useAdminSettings();

  return (
    <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32 search-container" style={{ position: 'relative' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Search</h1>
                      <p className="text-xl text-gray-500">Find your favorite movies and TV shows</p>
        </div>

        {/* Top Ad */}
        {adminSettings?.ads?.searchTopAd?.enabled && (
        <div className="mb-8">
          <AdBanner 
              adKey="searchTopAd"
              imageUrl={adminSettings.ads.searchTopAd.imageUrl}
                              cloudinaryUrl={adminSettings.ads.searchTopAd.cloudinaryUrl}
              clickUrl={adminSettings.ads.searchTopAd.clickUrl}
              enabled={adminSettings.ads.searchTopAd.enabled}
          />
      </div>
        )}

        {/* Search Bar and Filter Combined */}
        <div className="mb-8 p-6 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="What do you want to watch?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Hide any active tooltip
                    hideTooltip();
                    // Update URL with new search query
                    const newUrl = `/search?q=${encodeURIComponent(query.trim())}`;
                    window.history.pushState({}, '', newUrl);
                  }
                }}
                className="bg-gray-800 border-gray-700 text-white pl-10 pr-10 h-12 text-lg rounded-full focus:border-blue-500 focus:ring-0 focus:outline-none focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multi">All</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters Button */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={() => setShowExtendedFilters(!showExtendedFilters)}
            variant="outline"
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {showExtendedFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showExtendedFilters && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Year</label>
                  <Input
                    type="number"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    placeholder="e.g. 2023"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Rating</label>
                  <Select value={filters.rating} onValueChange={(value) => setFilters({ ...filters, rating: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any rating</SelectItem>
                      <SelectItem value="9">9+ Stars</SelectItem>
                      <SelectItem value="8">8+ Stars</SelectItem>
                      <SelectItem value="7">7+ Stars</SelectItem>
                      <SelectItem value="6">6+ Stars</SelectItem>
                      <SelectItem value="5">5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                  <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={16} />
                          Relevance
                        </div>
                      </SelectItem>
                      <SelectItem value="rating">
                        <div className="flex items-center gap-2">
                          <Star size={16} />
                          Rating
                        </div>
                      </SelectItem>
                      <SelectItem value="date">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          Release Date
                        </div>
                      </SelectItem>
                      <SelectItem value="title">Title A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && query && (
          <div className="space-y-6">
            {(() => {
              const filteredResults = results.filter((item) => {
                // Filter out items with no poster or unknown release date
                const hasPoster = item.poster_path && item.poster_path !== '';
                const hasValidDate = getItemReleaseDate(item) && formatReleaseDate(getItemReleaseDate(item)) !== 'Unknown';
                return hasPoster && hasValidDate;
              });
              
              return (
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Search Results for "{query}"
                  </h2>
                  <span className="text-gray-400">
                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })()}

            {results.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No results found for "{query}"</p>
                <p className="text-gray-500 mt-2">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {results
                  .filter((item) => {
                    // Filter out items with no poster or unknown release date
                    const hasPoster = item.poster_path && item.poster_path !== '';
                    const hasValidDate = getItemReleaseDate(item) && formatReleaseDate(getItemReleaseDate(item)) !== 'Unknown';
                    return hasPoster && hasValidDate;
                  })
                  .map((item) => (
                  <div
                    key={item.id}
                    data-movie-card
                    className="cursor-pointer group/item"
                    onClick={(e) => {
                      // Handle both mobile and desktop clicks
                      if (tooltipTimeout) {
                        clearTimeout(tooltipTimeout);
                        setTooltipTimeout(null);
                      }
                      setTooltipItem(null);

                      // On mobile, if name is showing, hide it and open movie
                      if (isMobile && showMovieName === item.id) {
                        setShowMovieName(null);
                      }

                      handleItemClick(item);
                    }}
                    onMouseEnter={isMobile ? undefined : (e) => handleMouseEnter(e, item)}
                    onMouseMove={isMobile ? undefined : (e) => handleMouseMove(e, item)}
                    onMouseLeave={isMobile ? undefined : handleTooltipMouseLeave}
                    onTouchStart={isMobile ? (e) => {
                      // Don't prevent default to allow normal click behavior
                      handleLongPressStart(item);
                    } : undefined}
                    onTouchEnd={isMobile ? (e) => {
                      // Don't prevent default - let onClick handle it
                      handleLongPressEnd(item);
                    } : undefined}
                    onTouchMove={isMobile ? handleLongPressCancel : undefined}
                    onTouchCancel={isMobile ? handleLongPressCancel : undefined}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                      <img
                        src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}
                        alt={getItemTitle(item)}
                        className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                        }}
                      />
                      
                      {/* Watchlist Button - Always visible */}
                      <button
                        onClick={(e) => toggleWatchlist(e, item)}
                        className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-100 z-20"
                        title={isInWatchlist(item) ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${isInWatchlist(item) ? 'fill-blue-500 text-blue-500' : 'text-white'}`}
                        />
                      </button>

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 hidden md:flex">
                        <img 
                          src="/playbutton.svg" 
                          alt="Play" 
                          className="w-16 h-16 drop-shadow-2xl filter brightness-110"
                        />
                      </div>
                      
                      {/* Rating Badge */}
                      {typeof item.vote_average === 'number' && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                          <Star className="w-3 h-3" />
                          {item.vote_average.toFixed(1)}
                        </div>
                      )}
                      
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 ${
                        isMobile
                          ? (showMovieName === item.id ? 'opacity-100' : 'opacity-0')
                          : 'opacity-0 group-hover/item:opacity-100'
                      }`}>
                        <div>
                          <h3 className="text-white font-semibold text-sm line-clamp-2">
                            {getItemTitle(item)}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Ad */}
        {adminSettings?.ads?.searchBottomAd?.enabled && (
        <div className="mt-12">
          <AdBanner 
              adKey="searchBottomAd"
              imageUrl={adminSettings.ads.searchBottomAd.imageUrl}
                              cloudinaryUrl={adminSettings.ads.searchBottomAd.cloudinaryUrl}
              clickUrl={adminSettings.ads.searchBottomAd.clickUrl}
              enabled={adminSettings.ads.searchBottomAd.enabled}
            />
          </div>
        )}
      </div>

      {/* Tooltip */}
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
                
                {'title' in tooltipItem && tooltipItem.runtime && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{Math.floor(tooltipItem.runtime / 60)}h {tooltipItem.runtime % 60}m</span>
                  </div>
                )}
                {'name' in tooltipItem && (tooltipItem as TVShow).number_of_seasons && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{(tooltipItem as TVShow).number_of_seasons} season{(tooltipItem as TVShow).number_of_seasons !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {'name' in tooltipItem && (tooltipItem as TVShow).seasons && (tooltipItem as TVShow).seasons!.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{(tooltipItem as TVShow).seasons!.reduce((total, season) => total + season.episode_count, 0)} episodes</span>
                  </div>
                )}
                
                {/* Description removed as requested */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movie Modal */}
      {selectedItem && 'title' in selectedItem && (
        <MovieModal
          movie={selectedItem as Movie}
          onClose={() => setSelectedItem(null)}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      {/* TV Show Player */}
      {selectedItem && 'name' in selectedItem && (
        <TVShowPlayer
          show={selectedItem as TVShow}
          onClose={() => setSelectedItem(null)}
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
          }
        `
      }} />
    </div>
  );
};

export default Search; 