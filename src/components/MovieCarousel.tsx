import React from 'react';
import { Movie, TVShow } from '@/services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MovieCarouselProps {
  title: string;
  items: (Movie | TVShow)[];
  onItemClick: (item: Movie | TVShow) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ title, items, onItemClick }) => {
  const scrollLeft = () => {
    const container = document.getElementById(`carousel-${title}`);
    if (container) {
      container.scrollLeft -= container.offsetWidth - 100;
    }
  };

  const scrollRight = () => {
    const container = document.getElementById(`carousel-${title}`);
    if (container) {
      container.scrollLeft += container.offsetWidth - 100;
    }
  };

  return (
    <div className="w-full relative group">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
      </div>

      {/* Scroll Buttons */}
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Movie Cards Container */}
      <div
        id={`carousel-${title}`}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-none w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px] snap-start cursor-pointer group/item"
            onClick={() => onItemClick(item)}
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
              <img
                src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                alt={item.title || item.name}
                className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <div>
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {item.title || item.name}
                  </h3>
                  <p className="text-gray-300 text-xs mt-1">
                    {new Date(item.release_date || item.first_air_date).getFullYear()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Scrollbar Style */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MovieCarousel; 