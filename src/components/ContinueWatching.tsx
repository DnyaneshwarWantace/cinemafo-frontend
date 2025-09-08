import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { WatchHistoryItem } from '@/hooks/useWatchHistory';

interface ContinueWatchingProps {
  items: WatchHistoryItem[];
  onItemClick: (item: WatchHistoryItem) => void;
  onRemoveItem: (item: WatchHistoryItem) => void;
  getThumbnailUrl?: (item: WatchHistoryItem) => string;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ 
  items, 
  onItemClick, 
  onRemoveItem,
  getThumbnailUrl: customGetThumbnailUrl
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Carousel functionality
  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 1200;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      // Use requestAnimationFrame to prevent forced reflow during scroll
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
          });
        }
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      // Use requestAnimationFrame to batch DOM reads and prevent forced reflow
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          setShowLeftArrow(scrollLeft > 0);
          setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
      });
    }
  }, []);

  // Debounced scroll handler to reduce frequency of calculations
  const debouncedHandleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, 16); // ~60fps
  }, [handleScroll]);

  // Mouse drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    
    // Use requestAnimationFrame to prevent forced reflow during drag
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
      }
    });
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', debouncedHandleScroll);
      
      // Use requestAnimationFrame for initial check to prevent forced reflow
      requestAnimationFrame(() => {
        handleScroll();
      });
      
      return () => {
        scrollElement.removeEventListener('scroll', debouncedHandleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll, debouncedHandleScroll]);

  // Early return after all hooks are called
  if (items.length === 0) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastWatched = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Generate a thumbnail URL based on progress (simulating Netflix-style thumbnails)
  const getThumbnailUrl = (item: WatchHistoryItem): string => {
    if (customGetThumbnailUrl) {
      return customGetThumbnailUrl(item);
    }
    
    // Default thumbnail logic
    if (item.backdrop_path) {
      return `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
    }
    return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
  };



  return (
    <div className="mb-12 relative z-20">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Continue Watching</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Continue Watching Container */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={`flex gap-4 overflow-x-auto scrollbar-hide pb-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            userSelect: 'none'
          }}
        >
          {items.map((item) => (
          <div
            key={`${item.id}-${item.type}-${item.season}-${item.episode}`}
            className="flex-none w-[280px] sm:w-[320px] md:w-[360px] lg:w-[400px] group/item cursor-pointer"
            onClick={() => onItemClick(item)}
          >
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
              {/* Main Thumbnail */}
              <img
                src={getThumbnailUrl(item)}
                alt={item.title}
                className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTEyLjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
                }}
              />
              
              {/* Progress Bar Overlay - Video Player Style */}
              <div className="absolute bottom-0 left-0 right-0">
                {/* Progress Bar */}
                <div className="w-full bg-black/50 h-1">
                  <div 
                    className="bg-blue-500 h-1 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                
                {/* Time Info Overlay */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                  {formatTime(item.currentTime)} / {formatTime(item.duration)}
                </div>
              </div>

              {/* Play Button Overlay - Crystal Style - Hidden on mobile */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 hidden md:flex">
                <img 
                  src="/playbutton.svg" 
                  alt="Play" 
                  className="w-16 h-16 drop-shadow-2xl filter brightness-110"
                />
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item);
                }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-300 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Episode Info for TV Shows */}
              {item.type === 'tv' && item.season && item.episode && (
                <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                  S{item.season} E{item.episode}
                </div>
              )}


            </div>
            
            {/* Title and Info - Netflix Style */}
            <div className="mt-3 group-hover/item:opacity-100 transition-opacity duration-300">
              <h3 className="text-sm font-medium text-white truncate mb-1">
                {item.title}
              </h3>
              {item.type === 'tv' && item.episodeTitle && (
                <p className="text-xs text-gray-400 truncate mb-1">
                  {item.episodeTitle}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {formatLastWatched(item.lastWatched)}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{Math.round(item.progress)}% watched</span>
                </div>
              </div>
              
              {/* Hover Details - Netflix Style */}
              <div className="mt-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>•</span>
                  <span>Resume from {formatTime(item.currentTime)}</span>
                  <span>•</span>
                  <span>{Math.round((item.duration - item.currentTime) / 60)} min left</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </div>
  );
};

export default ContinueWatching; 