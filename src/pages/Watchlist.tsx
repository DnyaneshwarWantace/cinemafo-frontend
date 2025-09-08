import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Play, Info, Heart, Star, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Movie, TVShow } from '@/services/api';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';

const Watchlist = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<(Movie | TVShow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipItem, setTooltipItem] = useState<Movie | TVShow | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { updateProgress } = useWatchHistory();

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Listen for storage changes to update watchlist
  useEffect(() => {
    const handleStorageChange = () => {
      loadWatchlist();
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
        const watchlistElement = document.querySelector('.watchlist-container');
        if (watchlistElement && !watchlistElement.contains(e.target as Node)) {
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
      
      hideTooltip();
    };
  }, [tooltipTimeout, watchlist]);

  // Clear tooltips when component mounts (e.g., returning from video player)
  useEffect(() => {
    hideTooltip();
  }, []);

  const loadWatchlist = () => {
    try {
      const saved = localStorage.getItem('watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      } else {
        setWatchlist([]);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = (e: React.MouseEvent, item: Movie | TVShow) => {
    e.stopPropagation();
    try {
    const updatedWatchlist = watchlist.filter(watchlistItem => 
      watchlistItem.id !== item.id || watchlistItem.media_type !== item.media_type
    );
    setWatchlist(updatedWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      console.log('Removed item from watchlist:', item);
    } catch (error) {
      console.error('Error removing item from watchlist:', error);
    }
  };

  const handleItemClick = (item: Movie | TVShow) => {
    // Always show modal first
    setSelectedItem(item);
  };

  const clearWatchlist = () => {
    console.log('Clear watchlist function called');
    try {
    setWatchlist([]);
    localStorage.removeItem('watchlist');
      console.log('Watchlist cleared successfully');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
    }
  };

  const getItemTitle = (item: Movie | TVShow): string => {
    return 'title' in item ? item.title : item.name;
  };

  const getItemReleaseDate = (item: Movie | TVShow): string => {
    return 'release_date' in item ? item.release_date : item.first_air_date;
  };

  const formatReleaseDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Tooltip functionality
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
    
    // Set timeout for 200ms delay as requested by client
    const timeout = setTimeout(() => {
      setTooltipItem(item);
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



  return (
    <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8 relative">
        {/* Header with Clear All Button */}
        <div className="mb-8 flex justify-between items-start">
          <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Watchlist</h1>
                      <p className="text-xl text-gray-500">
            {watchlist.length === 0 
              ? "Nothing here yet. Start adding movies and TV shows you want to watch." 
              : `${watchlist.length} title${watchlist.length !== 1 ? 's' : ''} queued up for your next movie night`
            }
          </p>
        </div>

          {/* Clear All Button */}
        {watchlist.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked!');
                clearWatchlist();
              }}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer text-sm"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
          </div>

        {/* Watchlist Items */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">Nothing here…</h3>
            <p className="text-gray-500">Start browsing and adding movies and TV shows to your watchlist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {watchlist.map((item) => (
              <div
                key={`${item.id}-${item.media_type}`}
                className="cursor-pointer group/item"
                onClick={(e) => {
                  // Prevent tooltip from showing on click
                  if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    setTooltipTimeout(null);
                  }
                  setTooltipItem(null);
                  handleItemClick(item);
                }}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseMove={(e) => handleMouseMove(e, item)}
                onMouseLeave={handleTooltipMouseLeave}
                onTouchStart={() => {
                  // Hide tooltip on touch start
                  if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    setTooltipTimeout(null);
                  }
                  setTooltipItem(null);
                }}
                onMouseOut={handleTooltipMouseLeave}
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
                  
                  {/* Individual Delete Button */}
                  <button
                    onClick={(e) => removeFromWatchlist(e, item)}
                    className="absolute top-2 left-2 bg-black/40 hover:bg-red-600 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                    title="Remove from watchlist"
                  >
                    <X size={16} />
                  </button>

                  {/* Play Button Overlay - Hidden on mobile */}
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
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
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
                
                {('title' in tooltipItem) && tooltipItem.runtime && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{Math.floor(tooltipItem.runtime / 60)}h {tooltipItem.runtime % 60}m</span>
                  </div>
                )}
                {('name' in tooltipItem) && (tooltipItem as TVShow).number_of_seasons && (
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span>{(tooltipItem as TVShow).number_of_seasons} season{(tooltipItem as TVShow).number_of_seasons !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {('name' in tooltipItem) && (tooltipItem as TVShow).seasons && (tooltipItem as TVShow).seasons!.length > 0 && (
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
    </div>
  );
};

export default Watchlist; 