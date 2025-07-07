import React, { useState, useEffect } from 'react';
import { Play, Info, Volume2, VolumeX } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
}

interface HeroSectionProps {
  items: Movie[];
  loading?: boolean;
  onItemClick?: (movie: Movie) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ items = [], loading = false, onItemClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!items || items.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [items?.length]);

  // Early return for loading or empty states
  if (loading || !items || items.length === 0) {
    return (
      <div className="relative h-screen bg-gradient-to-r from-gray-900 to-gray-800 animate-pulse">
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-12">
          <div className="max-w-2xl">
            <div className="h-16 bg-gray-700 rounded mb-4" />
            <div className="h-4 bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-6" />
            <div className="flex gap-4">
              <div className="h-12 w-32 bg-gray-700 rounded" />
              <div className="h-12 w-32 bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ensure currentIndex is valid
  const safeCurrentIndex = Math.min(currentIndex, items.length - 1);
  const currentMovie = items[safeCurrentIndex];

  // Safety check for currentMovie
  if (!currentMovie) {
    return (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">No movies available</p>
        </div>
      </div>
    );
  }

  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const title = currentMovie.title || currentMovie.name || 'Unknown Title';
  const overview = currentMovie.overview || 'No description available.';
  const backdropPath = currentMovie.backdrop_path;

  // If playing video, show video player
  if (isPlaying) {
    return (
      <VideoPlayer
        tmdbId={currentMovie.id}
        title={title}
        type={currentMovie.title ? 'movie' : 'tv'}
        onClose={() => setIsPlaying(false)}
      />
    );
  }

  const handleWatchNow = () => {
    try {
      setIsPlaying(true);
    } catch (error) {
      console.error('Error opening video player:', error);
    }
  };

  const handleMoreInfo = () => {
    try {
      if (onItemClick) {
        onItemClick(currentMovie);
      }
    } catch (error) {
      console.error('Error opening movie modal:', error);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        {backdropPath ? (
          <img
            src={`${imageBaseUrl}${backdropPath}`}
            alt={title}
            className="w-full h-full object-cover transition-opacity duration-1000"
            onError={(e) => {
              // Fallback to a gradient background if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 md:px-12 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {title}
            </h1>
            
            <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed line-clamp-3">
              {overview}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={handleWatchNow}
                className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-md text-lg font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform"
              >
                <Play size={24} />
                Watch Now
              </button>
              
              <button
                onClick={handleMoreInfo}
                className="inline-flex items-center gap-3 bg-gray-700/80 text-white px-8 py-4 rounded-md text-lg font-semibold hover:bg-gray-600/80 transition-all duration-200 hover:scale-105 transform backdrop-blur-sm"
              >
                <Info size={24} />
                More Info
              </button>
            </div>

            {/* Movie Indicators */}
            {items.length > 1 && (
              <div className="flex gap-2">
                {items.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-12 h-1 rounded-full transition-all duration-300 ${
                      index === safeCurrentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-24 right-8 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>
    </div>
  );
};

export default HeroSection; 