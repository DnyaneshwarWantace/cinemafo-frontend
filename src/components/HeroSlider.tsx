
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";

interface Movie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

interface HeroSliderProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
}

const HeroSlider: React.FC<HeroSliderProps> = ({ movies, onMovieClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (movies.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % movies.length);
    }, 5000); // Auto-slide every 5 seconds

    return () => clearInterval(interval);
  }, [movies.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % movies.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + movies.length) % movies.length);
  };

  if (!movies || movies.length === 0) {
    return (
      <div className="relative h-[70vh] bg-gradient-to-r from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const currentMovie = movies[currentSlide];

  return (
    <div className="relative h-[70vh] overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${currentMovie?.backdrop_path})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 fade-in">
              {currentMovie?.title || currentMovie?.name}
            </h1>
            <p className="text-lg text-gray-200 mb-6 line-clamp-3 fade-in">
              {currentMovie?.overview}
            </p>
            <div className="flex items-center gap-4 mb-8 fade-in">
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="text-2xl">★</span>
                <span className="text-white font-semibold">{currentMovie?.vote_average?.toFixed(1)}</span>
              </div>
              <div className="text-gray-300">
                {new Date(currentMovie?.release_date || currentMovie?.first_air_date).getFullYear()}
              </div>
            </div>
            <div className="flex gap-4 fade-in">
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8"
                onClick={() => onMovieClick(currentMovie)}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-gray-800/80 border-gray-600 text-white hover:bg-gray-700"
                onClick={() => onMovieClick(currentMovie)}
              >
                <Info className="w-5 h-5 mr-2" />
                More Info
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-red-600' : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
