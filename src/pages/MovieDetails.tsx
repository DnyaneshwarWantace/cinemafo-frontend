import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Star, ArrowLeft, Calendar, Clock, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import LoadingBar from '@/components/LoadingBar';
import VideoPlayer from '@/components/VideoPlayer';
import MovieRow from '@/components/MovieRow';
import api, { Movie } from '@/services/api';

interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

interface MovieCredits {
  cast: Cast[];
  crew: Crew[];
}

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [credits, setCredits] = useState<MovieCredits | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (id) {
      fetchMovieDetails(parseInt(id));
    }
  }, [id]);

  const fetchMovieDetails = async (movieId: number) => {
    try {
      setLoading(true);
      
      // Fetch movie details and similar movies
      const movieResponse = await api.getMovieDetails(movieId);
      const similarResponse = await api.getSimilarMovies(movieId);

      setMovie(movieResponse.data);
      setSimilarMovies(similarResponse.data?.results || []);

      // Mock credits for now
      const mockCredits: MovieCredits = {
        cast: [
          {
            id: 1,
            name: "Main Actor",
            character: "Lead Character",
            profile_path: null,
            order: 0
          }
        ],
        crew: [
          {
            id: 1,
            name: "Director Name",
            job: "Director",
            department: "Directing",
            profile_path: null
          }
        ]
      };
      setCredits(mockCredits);
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchNow = () => {
    if (movie) {
      // Navigate to watch page or trigger video player
      console.log('Watch movie:', movie.title);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="pt-24">
          <div className="animate-pulse">
            <div className="h-screen bg-gradient-to-r from-gray-900 to-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black">
        <div className="pt-24 text-center text-white">
          <h1 className="text-2xl">Movie not found</h1>
          <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  const profileBaseUrl = 'https://image.tmdb.org/t/p/w185';
  
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
  const rating = Math.round(movie.vote_average * 10) / 10;
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '';

  const director = credits?.crew.find(person => person.job === 'Director');
  const mainCast = credits?.cast.slice(0, 8) || [];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative pt-20">
        {/* Background Image */}
        <div className="h-screen relative overflow-hidden">
          <img
            src={`${imageBaseUrl}${movie.backdrop_path || movie.poster_path}`}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-28 left-4 md:left-12 z-10 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Content */}
        <div className="absolute inset-0 flex items-center pt-20">
          <div className="max-w-7xl mx-auto px-4 md:px-12 w-full">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Movie Poster */}
              <div className="flex-shrink-0">
                <img
                  src={`${posterBaseUrl}${movie.poster_path}`}
                  alt={movie.title}
                  className="w-80 rounded-lg shadow-2xl"
                />
              </div>

              {/* Movie Details */}
              <div className="flex-1 max-w-3xl">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                  {movie.title}
                </h1>

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
                    <span>English</span>
                  </div>
                </div>

                {/* Overview */}
                <p className="text-lg text-gray-200 mb-8 leading-relaxed">
                  {movie.overview || 'No overview available for this movie.'}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <button 
                    onClick={handleWatchNow}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <Play size={20} />
                    Watch Now
                  </button>
                  <button className="flex items-center gap-2 bg-gray-700/80 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600/80 transition-colors">
                    <Plus size={20} />
                    Add to List
                  </button>
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

                {/* Director Section */}
                {director && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Director</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800">
                        {director.profile_path ? (
                          <img
                            src={`${profileBaseUrl}${director.profile_path}`}
                            alt={director.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Photo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{director.name}</h4>
                        <p className="text-gray-400 text-sm">{director.job}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Movies Section */}
      {similarMovies.length > 0 && (
        <div className="relative z-10 -mt-32 pb-16">
          <MovieRow
            title="More Like This"
            movies={similarMovies}
            onItemClick={(movie) => navigate(`/movie/${movie.id}`)}
          />
        </div>
      )}

      <Footer />
      
      {/* Floating Social Buttons */}
      <FloatingSocialButtons />
      
      {isPlaying && selectedMovie && (
        <VideoPlayer 
          movie={selectedMovie}
          onClose={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};

export default MovieDetails; 