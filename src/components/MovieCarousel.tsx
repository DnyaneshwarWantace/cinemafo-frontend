import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Star, Calendar, Bookmark, Clock, Users } from 'lucide-react';
import { Movie, TVShow } from '@/services/api';

export interface MovieCarouselProps {
  title: string;
  items: (Movie | TVShow)[];
  onItemClick: (item: Movie | TVShow) => void;
  isUpcoming?: boolean;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, items, onItemClick, isUpcoming = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [watchlistUpdate, setWatchlistUpdate] = useState(0);
  const [tooltipItem, setTooltipItem] = useState<Movie | TVShow | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setWatchlistUpdate(prev => prev + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 1200;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Mouse drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getItemTitle = (item: Movie | TVShow): string => {
    return 'title' in item ? item.title : item.name;
  };

  const getItemReleaseDate = (item: Movie | TVShow): string => {
    return 'release_date' in item ? item.release_date : item.first_air_date;
  };

  const isInWatchlist = (item: Movie | TVShow): boolean => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      return watchlist.some((watchlistItem: any) => 
        watchlistItem.id === item.id && (watchlistItem.media_type || 'movie') === (item.media_type || 'movie')
      );
    } catch {
      return false;
    }
  };

  const toggleWatchlist = (e: React.MouseEvent, item: Movie | TVShow) => {
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

  const handleMouseEnter = (e: React.MouseEvent, item: Movie | TVShow) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    
    // Set timeout for 1.5 seconds
    const timeout = setTimeout(() => {
      setTooltipItem(item);
    }, 1500);
    
    setTooltipTimeout(timeout);
  };

  const handleTooltipMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setTooltipItem(null);
  };

  if (!items || items.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="flex items-center justify-center w-full py-8 text-gray-500">
          No items available
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12 group">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Movies Container */}
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
              key={item.id}
              className="flex-none w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px] cursor-pointer group/item"
              onClick={() => onItemClick(item)}
              onMouseEnter={(e) => handleMouseEnter(e, item)}
              onMouseLeave={handleTooltipMouseLeave}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                <img
                  src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                  alt={getItemTitle(item)}
                  className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWYyOTM3Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                />
                
                {/* Watchlist Button */}
                <button
                  onClick={(e) => toggleWatchlist(e, item)}
                  className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all duration-300 opacity-0 group-hover/item:opacity-100 z-20"
                >
                  <Bookmark 
                    size={16} 
                    className={isInWatchlist(item) ? 'fill-blue-500 text-blue-500' : 'text-white'} 
                  />
                </button>

                {/* Play Button or Calendar Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                  {isUpcoming ? (
                    <div className="bg-black/40 rounded-full p-4 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                  ) : (
                    <div className="crystal-play-button">
                      {/* Triangle is created via CSS ::before pseudo-element */}
                    </div>
                  )}
                </div>
                
                {/* Rating Badge or Release Date Badge */}
                {isUpcoming ? (
                  <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                    <Calendar className="w-3 h-3" />
                    {formatReleaseDate(getItemReleaseDate(item))}
                  </div>
                ) : (
                  typeof item.vote_average === 'number' && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                      <Star className="w-3 h-3" />
                      {item.vote_average.toFixed(1)}
                    </div>
                  )
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
                src={`https://image.tmdb.org/t/p/w92${tooltipItem.poster_path}`}
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

export default MovieCarousel; 