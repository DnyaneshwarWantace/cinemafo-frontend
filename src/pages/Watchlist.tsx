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
  const { updateProgress } = useWatchHistory();


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

  // Cleanup tooltip on component unmount or when items change
  useEffect(() => {
    // Debounced mouse move handler to reduce performance impact
    let mouseMoveTimeout: NodeJS.Timeout;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Clear existing timeout
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      
      // Debounce the mouse move check
      mouseMoveTimeout = setTimeout(() => {
        const watchlistElement = document.querySelector('.watchlist-container');
        if (watchlistElement && !watchlistElement.contains(e.target as Node)) {
          hideTooltip();
        }
      }, 50); // 50ms debounce
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideTooltip();
      }
    };

    const handleGlobalClick = () => {
      hideTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    // Debounced scroll handler
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        hideTooltip();
      }, 100); // 100ms debounce
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

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('hideTooltips', handleHideTooltips);
      
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      hideTooltip();
    };
  }, [tooltipTimeout, watchlist]);

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
    
    // Clear any existing timeout immediately
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    
    // Show tooltip immediately for better responsiveness
    setTooltipItem(item);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 watchlist-container">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-32 sm:pt-32 md:pt-32 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8 relative">
        {/* Header with Clear All Button */}
        <div className="mb-8 flex justify-between items-start">
          <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">My Watchlist</h1>
          <p className="text-xl text-gray-400">
            {watchlist.length === 0 
              ? "Your watchlist is empty. Start adding movies and TV shows!" 
              : `${watchlist.length} item${watchlist.length !== 1 ? 's' : ''} in your watchlist`
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
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer z-50"
              style={{ pointerEvents: 'auto' }}
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
          </div>

        {/* Watchlist Items */}
        {watchlist.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No items in watchlist</h3>
            <p className="text-gray-500">Start browsing movies and TV shows to add them to your watchlist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {watchlist.map((item) => (
              <div
                key={`${item.id}-${item.media_type}`}
                className="cursor-pointer group/item"
                onClick={() => handleItemClick(item)}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={handleTooltipMouseLeave}
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

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                    <div className="crystal-play-button">
                      {/* Triangle is created via CSS ::before pseudo-element */}
                    </div>
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
                      <p className="text-gray-300 text-xs mt-1">
                        {formatReleaseDate(getItemReleaseDate(item))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>



      {/* Tooltip */}
      {tooltipItem && (
        <div
          className="fixed z-[9998] bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl p-4 max-w-xs pointer-events-none"
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