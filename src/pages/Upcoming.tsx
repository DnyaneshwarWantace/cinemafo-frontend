import React, { useEffect, useState } from 'react';
import MovieModal from '@/components/MovieModal';
import MovieCarousel from '@/components/MovieCarousel';
import HeroSlider from '@/components/HeroSlider';
import api, { Movie } from '@/services/api';
import { Loader2, Calendar } from 'lucide-react';

const Upcoming = () => {
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingMovies = async () => {
      try {
        setLoading(true);
        const response = await api.getUpcomingMovies();
        // Filter to only show truly upcoming movies (not released yet)
        const today = new Date();
        const actuallyUpcoming = response.data?.results?.filter(movie => 
          new Date(movie.release_date) > today
        ) || [];
        setUpcomingMovies(actuallyUpcoming);
      } catch (err) {
        setError('Failed to load upcoming movies');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUpcomingMovies();
  }, []);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Section with upcoming movies */}
      {upcomingMovies.length > 0 && (
        <HeroSlider 
          items={upcomingMovies.slice(0, 5)} 
          onItemClick={handleMovieClick}
        />
      )}
      {/* Upcoming Movies Section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold">Upcoming Movies</h1>
        </div>
        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <MovieCarousel
            title="Upcoming Movies"
            items={upcomingMovies}
            onItemClick={handleMovieClick}
            isUpcoming={true}
          />
        )}
        {upcomingMovies.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Upcoming Movies</h3>
            <p className="text-gray-500">Check back later for new releases!</p>
          </div>
        )}
      </div>
      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          onClose={handleCloseModal}
          movie={selectedMovie}
        />
      )}
    </div>
  );
};

export default Upcoming; 