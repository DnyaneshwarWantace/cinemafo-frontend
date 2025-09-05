import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Play, Info, Star, Calendar } from 'lucide-react';
import { Movie, TVShow } from '@/services/api';

interface HeroSliderProps {
  items: (Movie | TVShow)[];
  onItemClick?: (item: Movie | TVShow) => void;
}

const HeroSlider: React.FC<HeroSliderProps> = ({ items, onItemClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    }, 3000);
    
    return () => clearInterval(interval);
  }, [items.length]);

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!items || !items.length) return null;

  const currentItem = items[currentIndex];
  const title = 'title' in currentItem ? currentItem.title : currentItem.name;
  const releaseDate = 'release_date' in currentItem ? currentItem.release_date : currentItem.first_air_date;
  const isUpcoming = new Date(releaseDate) > new Date();

  return (
    <div className="relative w-full h-[calc(100vh-80px)] min-h-[400px] overflow-hidden group 
                    max-[896px]:landscape:h-[calc(100vh-60px)] 
                    max-[896px]:landscape:min-h-[500px] 
                    max-[896px]:landscape:max-h-[calc(100vh-100px)]">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={`https://image.tmdb.org/t/p/original${currentItem.backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover object-top transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-4 sm:p-8 md:p-16 z-10 flex flex-col justify-center h-full max-w-screen-xl mx-auto
                      max-[896px]:landscape:p-2 
                      max-[896px]:landscape:pl-20
                      max-[896px]:landscape:pr-20
                      max-[896px]:landscape:justify-start 
                      max-[896px]:landscape:pt-32 
                      max-[896px]:landscape:mt-8">

        {/* Rating or Release Date Badge */}
        {isUpcoming ? (
          <div className="inline-flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-semibold mb-4 w-fit
                          max-[896px]:landscape:px-2 
                          max-[896px]:landscape:py-1 
                          max-[896px]:landscape:text-xs 
                          max-[896px]:landscape:mb-2">
            <Calendar className="w-4 h-4 max-[896px]:landscape:w-3 max-[896px]:landscape:h-3" />
            Coming {formatReleaseDate(releaseDate)}
          </div>
        ) : (
          currentItem.vote_average > 0 && (
            <div className="inline-flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-semibold mb-4 w-fit
                            max-[896px]:landscape:px-2 
                            max-[896px]:landscape:py-1 
                            max-[896px]:landscape:text-xs 
                            max-[896px]:landscape:mb-2">
              <Star className="w-4 h-4 text-yellow-400 max-[896px]:landscape:w-3 max-[896px]:landscape:h-3" />
              {currentItem.vote_average.toFixed(1)} Rating
              {'vote_count' in currentItem && currentItem.vote_count > 0 && (
                <span className="text-gray-400 text-xs max-[896px]:landscape:text-[10px]">
                  ({currentItem.vote_count.toLocaleString()} votes)
                </span>
              )}
            </div>
          )
        )}

        <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg
                       max-[896px]:landscape:text-xl 
                       max-[896px]:landscape:mb-2">
          {title}
        </h1>
        
        {/* Genres */}
        {currentItem.genres && currentItem.genres.length > 0 && (
          <div className="flex gap-2 mb-4 
                          max-[896px]:landscape:gap-1 
                          max-[896px]:landscape:mb-2">
            {currentItem.genres.slice(0, 3).map((genre) => (
              <span key={genre.id} className="text-sm bg-white/10 text-white/90 px-3 py-1 rounded-full
                                               max-[896px]:landscape:text-xs 
                                               max-[896px]:landscape:px-2 
                                               max-[896px]:landscape:py-0.5">
                {genre.name}
              </span>
            ))}
          </div>
        )}

        <p className="text-base sm:text-lg md:text-xl text-white/80 mb-4 sm:mb-6 line-clamp-3 max-w-2xl drop-shadow
                      max-[896px]:landscape:text-xs 
                      max-[896px]:landscape:mb-2 
                      max-[896px]:landscape:line-clamp-1">
          {currentItem.overview}
        </p>

        <div className="flex gap-3 sm:gap-4 mb-8 
                        max-[896px]:landscape:gap-2 
                        max-[896px]:landscape:mb-3">
          {isUpcoming ? (
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2 
                         max-[896px]:landscape:h-8 
                         max-[896px]:landscape:text-xs 
                         max-[896px]:landscape:px-3"
              onClick={() => onItemClick?.(currentItem)}
            >
              <Calendar className="w-5 h-5 max-[896px]:landscape:w-4 max-[896px]:landscape:h-4" />
              <span className="max-[896px]:landscape:hidden">Coming Soon</span>
              <span className="hidden max-[896px]:landscape:inline">Soon</span>
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="gap-2 bg-primary hover:bg-primary/90
                         max-[896px]:landscape:h-8 
                         max-[896px]:landscape:text-xs 
                         max-[896px]:landscape:px-3"
              onClick={() => onItemClick?.(currentItem)}
            >
              <Play className="w-5 h-5 max-[896px]:landscape:w-4 max-[896px]:landscape:h-4" />
              <span className="max-[896px]:landscape:hidden">Watch Now</span>
              <span className="hidden max-[896px]:landscape:inline">Watch</span>
            </Button>
          )}
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2 
                       max-[896px]:landscape:h-8 
                       max-[896px]:landscape:text-xs 
                       max-[896px]:landscape:px-3"
            onClick={() => onItemClick?.(currentItem)}
          >
            <Info className="w-5 h-5 max-[896px]:landscape:w-4 max-[896px]:landscape:h-4" />
            <span className="max-[896px]:landscape:hidden">More Info</span>
            <span className="hidden max-[896px]:landscape:inline">Info</span>
          </Button>
        </div>

        {/* Indicators - Positioned within content area */}
        {items.length > 1 && (
          <div className="flex gap-2 max-[896px]:landscape:gap-1">
            {items.map((_, index) => (
              <button
                key={index}
                className={`w-12 h-1 rounded-full transition-all duration-300 
                           max-[896px]:landscape:w-8 
                           max-[896px]:landscape:h-0.5 
                           ${index === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroSlider;