import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Play, Info, Star, Calendar } from 'lucide-react';
import { Movie, TVShow } from '@/services/api';

interface HeroSliderProps {
  items: (Movie | TVShow)[];
  onItemClick?: (item: Movie | TVShow) => void;
}

const HeroSlider: React.FC<HeroSliderProps> = ({ items, onItemClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!items.length) return null;

  const currentItem = items[currentIndex];
  const title = 'title' in currentItem ? currentItem.title : currentItem.name;
  const releaseDate = 'release_date' in currentItem ? currentItem.release_date : currentItem.first_air_date;
  const isUpcoming = new Date(releaseDate) > new Date();

  return (
    <div className="relative w-full h-[50vh] min-h-[300px] md:h-[70vh] lg:h-[90vh] overflow-hidden group">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full"
      >
        <img
          src={`https://image.tmdb.org/t/p/original${currentItem.backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover object-center md:object-center lg:object-center transition-transform duration-500"
          style={{
            transform: isTransitioning ? 'scale(1.05)' : 'scale(1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 md:p-16 z-10 flex flex-col justify-end h-full max-w-screen-xl mx-auto">
        {/* Rating or Release Date Badge */}
        {isUpcoming ? (
          <div className="inline-flex items-center gap-2 bg-black/80 text-white px-3 py-1.5 rounded-full text-sm font-semibold mb-4 w-fit">
            <Calendar className="w-4 h-4" />
            Coming {formatReleaseDate(releaseDate)}
          </div>
        ) : (
          currentItem.vote_average > 0 && (
            <div className="inline-flex items-center gap-2 bg-black/80 text-white px-3 py-1.5 rounded-full text-sm font-semibold mb-4 w-fit">
              <Star className="w-4 h-4 text-yellow-400" />
              {currentItem.vote_average.toFixed(1)} Rating
              {currentItem.vote_count > 0 && (
                <span className="text-gray-400 text-xs">
                  ({currentItem.vote_count.toLocaleString()} votes)
                </span>
              )}
            </div>
          )
        )}

        <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4 drop-shadow-lg">
          {title}
        </h1>
        
        {/* Genres */}
        {currentItem.genres && currentItem.genres.length > 0 && (
          <div className="flex gap-2 mb-4">
            {currentItem.genres.slice(0, 3).map((genre) => (
              <span key={genre.id} className="text-sm bg-white/10 text-white/90 px-3 py-1 rounded-full">
                {genre.name}
              </span>
            ))}
          </div>
        )}

        <p className="text-base sm:text-lg md:text-xl text-white/80 mb-4 sm:mb-6 line-clamp-3 max-w-2xl drop-shadow">
          {currentItem.overview}
        </p>
        <div className="flex gap-3 sm:gap-4">
          {isUpcoming ? (
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2"
              onClick={() => onItemClick?.(currentItem)}
            >
              <Calendar className="w-5 h-5" />
              Coming Soon
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => onItemClick?.(currentItem)}
            >
              <Play className="w-5 h-5" />
              Watch Now
            </Button>
          )}
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2"
            onClick={() => onItemClick?.(currentItem)}
          >
            <Info className="w-5 h-5" />
            More Info
          </Button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={handlePrev}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>
      <div className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={handleNext}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {items.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
            }`}
            onClick={() => {
              setCurrentIndex(index);
              setIsTransitioning(true);
              setTimeout(() => setIsTransitioning(false), 500);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
