import React, { useState, useEffect } from 'react';
import { Play, Plus, Star, ArrowLeft, Calendar, Clock, Globe, Check } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import VideoPlayer from '@/components/VideoPlayer';
import MovieCard from './MovieCard';
import MovieRow from './MovieRow';
import Navigation from './Navigation';
import api, { Movie, TVShow } from '@/services/api';
import AdBanner from './AdBanner';

interface MovieModalProps {
  movie: Movie | TVShow;
  onClose: () => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose }) => {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inWatchlist = isInWatchlist(movie.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Load similar movies
    loadSimilarMovies();
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, movie.id]);

  const loadSimilarMovies = async () => {
    try {
      setLoadingSimilar(true);
      const response = await api.getSimilarMovies(movie.id);
      setSimilarMovies(response.data?.results?.slice(0, 12) || []);
    } catch (error) {
      console.error('Error loading similar movies:', error);
      setSimilarMovies([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleBackClick = () => {
    onClose();
  };

  const handleWatchNow = () => {
    setIsPlaying(true);
  };

  const handleToggleWatchlist = () => {
    const type = 'title' in movie ? 'movie' : 'tv';
    toggleWatchlist(movie, type);
  };

  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  const profileBaseUrl = 'https://image.tmdb.org/t/p/w185';
  
  // Handle both movie and TV show data
  const title = ('title' in movie ? movie.title : movie.name) || 'Unknown Title';
  const releaseDate = ('release_date' in movie ? movie.release_date : movie.first_air_date);
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const rating = Math.round(movie.vote_average * 10) / 10;
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';
  
  // Check if this is an upcoming movie (release date in future)
  const isUpcoming = releaseDate && new Date(releaseDate) > new Date();
  const isMovie = 'title' in movie;
  const isShow = 'name' in movie && !isMovie;

  // Use real data from the movie object or provide fallbacks
  const director = movie.crew?.find(person => person.job === 'Director');
  const mainCast = movie.cast?.slice(0, 8) || [];
  
  // Debug log to see what data we're getting
  console.log('Movie data:', movie);
  console.log('Cast data:', movie.cast);
  console.log('Crew data:', movie.crew);
  console.log('Is upcoming:', isUpcoming);
  console.log('Is show:', isShow);

  // If playing, show video player
  if (isPlaying) {
    return (
      <VideoPlayer
        tmdbId={movie.id}
        title={title}
        type={isMovie ? 'movie' : 'tv'}
        onClose={() => setIsPlaying(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {/* Navigation Bar */}
      <Navigation />
      
      {/* Hero Section - Added proper top padding */}
      <div className="relative pt-20">
        {/* Background Image */}
        <div className="h-screen relative overflow-hidden">
          <img
            src={`${imageBaseUrl}${movie.backdrop_path || movie.poster_path}`}
            alt={title}
              className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
              />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            </div>

        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="absolute top-24 left-4 md:left-12 z-10 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          Back
        </button>

            {/* Content */}
        <div className="absolute inset-0 flex items-center pt-48 pb-32">
          <div className="max-w-7xl mx-auto px-4 md:px-12 w-full">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Movie Poster */}
              <div className="flex-shrink-0">
                <img
                  src={`${posterBaseUrl}${movie.poster_path}`}
                  alt={title}
                  className="w-72 lg:w-80 rounded-lg shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-poster.jpg';
                  }}
                  />
                </div>

              {/* Movie Details */}
              <div className="flex-1 max-w-3xl mt-8 lg:mt-0">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {title}
                </h1>

                  {movie.tagline && (
                  <p className="text-xl text-gray-300 mb-6 italic">"{movie.tagline}"</p>
                )}

                {/* Movie Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{year}</span>
                  </div>
                  {runtime && (
                    <div className="flex items-center gap-2">
                      <Clock size={18} />
                      <span>{runtime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Star className="text-yellow-400 fill-yellow-400" size={18} />
                    <span className="font-medium">{rating}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={18} />
                    <span>{movie.spoken_languages?.[0]?.name || 'English'}</span>
                  </div>
                </div>

                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="bg-gray-800/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description Section */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                  <p className="text-lg text-gray-200 leading-relaxed">
                    {movie.overview || 'No overview available for this movie.'}
                  </p>
                </div>

                {/* Cast Section */}
                {mainCast.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Starring</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {mainCast.map((actor) => (
                        <div key={actor.id} className="text-center">
                          <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-gray-800">
                            {actor.profile_path ? (
                              <img
                                src={`${profileBaseUrl}${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Photo</span>
                              </div>
                            )}
                          </div>
                          <h4 className="text-white font-medium text-sm mb-1">{actor.name}</h4>
                          <p className="text-gray-400 text-xs">{actor.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  {/* Show different buttons based on content type */}
                  {isUpcoming ? (
                    <div className="inline-flex items-center gap-3 bg-gray-600 text-white px-8 py-4 rounded-md text-lg font-semibold cursor-not-allowed opacity-75">
                      <Calendar size={24} />
                      Releases {new Date(releaseDate!).toLocaleDateString()}
                </div>
                  ) : isShow ? (
          <button
                      onClick={handleWatchNow}
                      className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-md text-lg font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform"
          >
                      <Play size={24} />
                      Watch Episodes
          </button>
                  ) : (
            <button
                      onClick={handleWatchNow}
                      className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-md text-lg font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform"
                    >
                      <Play size={24} />
                      Watch Now
            </button>
          )}
          
              <button
                    onClick={handleToggleWatchlist}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-md text-lg font-semibold transition-all duration-200 hover:scale-105 transform backdrop-blur-sm ${
                      inWatchlist 
                        ? 'bg-green-600/80 text-white hover:bg-green-700/80' 
                        : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                    }`}
                  >
                    {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                    {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                          </button>
                </div>

                {/* Director */}
                {director && (
                  <div className="text-gray-300">
                    <span className="font-medium">Directed by:</span> {director.name}
            </div>
          )}

                {/* TV Show specific info */}
                {isShow && (movie as TVShow).number_of_seasons && (
                  <div className="text-gray-300 mt-2">
                    <span className="font-medium">Seasons:</span> {(movie as TVShow).number_of_seasons}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Movies Section */}
      {similarMovies.length > 0 && (
        <div className="bg-black pb-16 pt-8">
          <MovieRow 
            title="More Like This" 
            movies={similarMovies} 
            loading={loadingSimilar}
            onItemClick={(clickedMovie) => {
              onClose(); // Close current modal
              // Need to trigger parent to open new modal
              setTimeout(() => {
                // This will be handled by parent component
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('openMovieModal', { detail: clickedMovie }));
                }
              }, 100);
            }}
          />
        </div>
      )}

      {/* Loading Similar Movies */}
      {loadingSimilar && similarMovies.length === 0 && (
        <div className="bg-black pb-16 pt-8">
          <MovieRow title="More Like This" movies={[]} loading={true} />
        </div>
      )}

      {/* Player Page Ad */}
      <div className="bg-black py-8">
        <div className="max-w-4xl mx-auto px-4 md:px-12">
          <AdBanner adKey="playerPageAd" className="mb-8" />
        </div>
      </div>
    </div>
  );
};

export default MovieModal;