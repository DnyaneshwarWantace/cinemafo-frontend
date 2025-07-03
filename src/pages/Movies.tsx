import React, { useEffect, useState } from 'react';
import MovieModal from '@/components/MovieModal';
import MovieCarousel from '@/components/MovieCarousel';
import { Button } from '@/components/ui/button';
import HeroSlider from '@/components/HeroSlider';
import api, { Movie } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { LanguageSelector } from '@/components/ui/language-selector';

const Movies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [genresResponse, moviesResponse] = await Promise.all([
          api.getMovieGenres(),
          api.getPopularMovies()
        ]);
        setGenres(genresResponse.data.genres);
        setMovies(moviesResponse.data.results);
      } catch (err) {
        setError('Failed to load movies');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchMoviesByGenre = async () => {
      if (selectedGenre === null) return;
      
      try {
        setLoading(true);
        const response = await api.getMoviesByGenre(selectedGenre);
        setMovies(response.data.results);
      } catch (err) {
        setError('Failed to load movies');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMoviesByGenre();
  }, [selectedGenre]);

  const handleGenreClick = (genreId: number) => {
    setSelectedGenre(genreId === selectedGenre ? null : genreId);
  };

  const fetchMovies = async (language: string) => {
    setIsLoading(true);
    try {
      const [trending, popular, topRated] = await Promise.all([
        api.getTrendingMovies(language),
        api.getPopularMovies(language),
        api.getTopRatedMovies(language)
      ]);

      setTrendingMovies(trending.data.results);
      setPopularMovies(popular.data.results);
      setTopRatedMovies(topRated.data.results);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMovies(selectedLanguage);
  }, [selectedLanguage]);

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
      {/* Language Selector */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-end mb-8">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={(language) => setSelectedLanguage(language)}
          />
        </div>

        {/* Hero Section */}
        <HeroSlider 
          items={movies.slice(0, 5)} 
          onItemClick={(item) => setSelectedMovie(item as Movie)}
        />

        {/* Genre Filter */}
        <div className="container mx-auto px-4 py-8">
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

          {/* Movies Carousel */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <MovieCarousel
              title={selectedGenre ? `${genres.find(g => g.id === selectedGenre)?.name} Movies` : "Popular Movies"}
              items={movies}
              onItemClick={(item) => setSelectedMovie(item as Movie)}
            />
          )}
        </div>

        {/* Movie Sections */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Trending Movies</h2>
          <MovieCarousel 
            title="Trending Movies"
            items={trendingMovies}
            onItemClick={handleMovieClick}
          />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Movies</h2>
          <MovieCarousel 
            title="Popular Movies"
            items={popularMovies}
            onItemClick={handleMovieClick}
          />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Top Rated Movies</h2>
          <MovieCarousel 
            title="Top Rated Movies"
            items={topRatedMovies}
            onItemClick={handleMovieClick}
          />
        </section>
      </div>

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Movies; 