import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
}

interface MovieRowProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
  onItemClick?: (movie: Movie) => void;
}

const MovieRow: React.FC<MovieRowProps> = ({ title, movies, loading = false, onItemClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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

  if (loading) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6 px-4 md:px-12">{title}</h2>
        <div className="flex gap-4 px-4 md:px-12">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="w-64 h-96 bg-gray-800 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div className="mb-12 group">
      <h2 className="text-2xl font-bold text-white mb-6 px-4 md:px-12">{title}</h2>
      
      <div className="relative px-4 md:px-12">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
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
          {movies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onItemClick={onItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieRow; 