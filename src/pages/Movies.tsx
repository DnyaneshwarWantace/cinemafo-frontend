import React, { useEffect, useState } from 'react';
import MovieModal from '@/components/MovieModal';
import MovieCarousel from '@/components/MovieCarousel';
import HeroSlider from '@/components/HeroSlider';
import api, { Movie } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Movies = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresResponse = await api.getMovieGenres();
        setGenres(genresResponse.data.genres);
      } catch (err) {
        setError('Failed to load genres');
        console.error(err);
      }
    };
    fetchGenres();
  }, []);

  const fetchMovies = async (genreId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const [trending, popular, topRated, upcoming] = await Promise.all([
        genreId ? api.getMoviesByGenre(genreId) : api.getTrendingMovies(),
        api.getPopularMovies(),
        api.getTopRatedMovies(),
        api.getUpcomingMovies()
      ]);

      // Filter upcoming movies to only show unreleased ones
      const today = new Date();
      const actuallyUpcoming = upcoming.data.results.filter(movie => 
        new Date(movie.release_date) > today
      );

      setTrendingMovies(trending.data.results);
      setPopularMovies(popular.data.results);
      setTopRatedMovies(topRated.data.results);
      setUpcomingMovies(actuallyUpcoming);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setError('Failed to load movies. Please try again later.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies(selectedGenre || undefined);
  }, [selectedGenre]);

  const handleGenreClick = (genreId: number) => {
    setSelectedGenre(genreId === selectedGenre ? null : genreId);
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="w-full">
        <HeroSlider 
          items={trendingMovies.slice(0, 5)}
          onItemClick={handleMovieClick}
        />
      </section>

      {/* Content Sections */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-12 py-8">
        {/* Genre Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {genres.map((genre) => (
            <Button
              key={genre.id}
              variant={selectedGenre === genre.id ? "default" : "secondary"}
              onClick={() => handleGenreClick(genre.id)}
              className="rounded-full"
            >
              {genre.name}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {upcomingMovies.length > 0 && (
              <section>
                <MovieCarousel
                  title="Coming Soon"
                  items={upcomingMovies}
                  onItemClick={handleMovieClick}
                  isUpcoming={true}
                />
              </section>
            )}

            <section>
              <MovieCarousel 
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleMovieClick}
              />
            </section>

            <section>
              <MovieCarousel 
                title="Popular Movies"
                items={popularMovies}
                onItemClick={handleMovieClick}
              />
            </section>

            <section>
              <MovieCarousel 
                title="Top Rated Movies"
                items={topRatedMovies}
                onItemClick={handleMovieClick}
              />
            </section>
          </>
        )}
      </div>

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default Movies; 