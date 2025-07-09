import React, { useState, memo } from 'react';
import { Star, Play, Plus, Check, Film } from 'lucide-react';
import { Movie, TVShow } from '@/services/api';
import { useWatchlist } from '@/hooks/useWatchlist';

interface MovieCardProps {
  movie: Movie | TVShow;
  size?: 'small' | 'medium' | 'large';
  onItemClick?: (movie: Movie | TVShow) => void;
}

const MovieCard: React.FC<MovieCardProps> = memo(({ movie, size = 'medium', onItemClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  const cardSizes = {
    small: 'w-32 h-48',
    medium: 'w-48 h-72',
    large: 'w-64 h-96'
  };

  // Handle both movies (title/release_date) and TV shows (name/first_air_date)
  const title = 'title' in movie ? movie.title : movie.name;
  const releaseDate = 'release_date' in movie ? movie.release_date : movie.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const rating = movie.vote_average ? Number(movie.vote_average.toFixed(1)) : 0;
  const movieType = 'title' in movie ? 'movie' : 'tv';
  const inWatchlist = isInWatchlist(movie.id);

  const handleClick = () => {
    if (onItemClick) {
      onItemClick(movie);
    }
  };

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (inWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie, movieType);
    }
  };

  return (
    <div
      className={`${cardSizes[size]} flex-shrink-0 cursor-pointer transition-all duration-300 ease-out relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        zIndex: isHovered ? 999 : 1,
      }}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-800 shadow-lg transition-all duration-300 group-hover:shadow-2xl">
        {/* Movie Poster */}
        {!imageError && movie.poster_path ? (
          <img
            src={`${imageBaseUrl}${movie.poster_path}`}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Film size={48} className="mx-auto mb-2" />
              <p className="text-sm font-medium px-2">{title}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent transition-all duration-300 flex flex-col justify-end p-4 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="text-white transform transition-transform duration-300 translate-y-0">
            <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">{title}</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">{year}</span>
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{rating}</span>
                </div>
              )}
            </div>
            {movie.overview && (
              <p className="text-sm text-gray-300 line-clamp-2 mb-4 leading-relaxed">{movie.overview}</p>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                className="flex items-center gap-1 bg-white text-black px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleClick();
                }}
              >
                <Play size={12} />
                Play
              </button>
              <button 
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors backdrop-blur-sm ${
                  inWatchlist 
                    ? 'bg-green-600/90 text-white hover:bg-green-500/90' 
                    : 'bg-gray-700/90 text-white hover:bg-gray-600/90'
                }`}
                onClick={handleWatchlistToggle}
              >
                {inWatchlist ? <Check size={12} /> : <Plus size={12} />}
                {inWatchlist ? 'Added' : 'List'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard; 