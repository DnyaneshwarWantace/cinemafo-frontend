import React, { useEffect, useState } from 'react';
import { Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import MovieRow from '@/components/MovieRow';
import HeroSection from '@/components/HeroSection';
import MovieModal from '@/components/MovieModal';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import AdBanner from '@/components/AdBanner';
import AnnouncementBar from '@/components/AnnouncementBar';
import api, { Movie } from '@/services/api';
import { Loader2, Film, Tv, Zap, Heart, Star } from 'lucide-react';

interface Genre {
  id: number;
  name: string;
}

const Movies = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchGenres();
    fetchInitialMovies();
  }, []);

  useEffect(() => {
    if (selectedGenre || sortBy !== 'popularity.desc') {
      fetchFilteredMovies(1, true);
    }
  }, [selectedGenre, sortBy]);

  useEffect(() => {
    fetchInitialMovies();
  }, []);

  // Handle custom events from "More Like This" clicks
  useEffect(() => {
    const handleOpenMovieModal = (event: any) => {
      const movie = event.detail;
      handleMovieClick(movie);
    };

    window.addEventListener('openMovieModal', handleOpenMovieModal);

    return () => {
      window.removeEventListener('openMovieModal', handleOpenMovieModal);
    };
  }, []);

    const fetchGenres = async () => {
      try {
        const genresResponse = await api.getMovieGenres();
      setGenres(genresResponse.data?.genres || []);
      } catch (err) {
        setError('Failed to load genres');
        console.error(err);
      }
    };

  const fetchInitialMovies = async () => {
    setLoading(true);
    setHeroLoading(true);
    setError(null);
    try {
      const [trending, popular, topRated, upcoming] = await Promise.all([
        api.getTrendingMovies(),
        api.getPopularMovies(),
        api.getTopRatedMovies(),
        api.getUpcomingMovies()
      ]);

      // Filter upcoming movies to only show unreleased ones
      const today = new Date();
      const actuallyUpcoming = upcoming.data?.results?.filter(movie => 
        new Date(movie.release_date) > today
      ) || [];

      const trendingResults = trending.data?.results || [];
      const popularResults = popular.data?.results || [];
      const topRatedResults = topRated.data?.results || [];

      setTrendingMovies(trendingResults);
      setPopularMovies(popularResults);
      setTopRatedMovies(topRatedResults);
      setUpcomingMovies(actuallyUpcoming);
      setHeroMovies(trendingResults.slice(0, 5)); // Set hero movies from trending
      setMovies(popularResults); // Default to popular movies
    } catch (error) {
      console.error('Error fetching movies:', error);
      setError('Failed to load movies. Please try again later.');
    }
    setLoading(false);
    setHeroLoading(false);
  };

  const fetchFilteredMovies = async (page: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let response;
      if (selectedGenre) {
        response = await api.getMoviesByGenre(parseInt(selectedGenre));
      } else {
        // Use existing data based on sort
        switch (sortBy) {
          case 'vote_average.desc':
            response = { data: { results: topRatedMovies, total_pages: 1 } };
            break;
          case 'release_date.desc':
            response = { data: { results: upcomingMovies, total_pages: 1 } };
            break;
          case 'title.asc':
            const sortedAsc = [...popularMovies].sort((a, b) => a.title.localeCompare(b.title));
            response = { data: { results: sortedAsc, total_pages: 1 } };
            break;
          case 'title.desc':
            const sortedDesc = [...popularMovies].sort((a, b) => b.title.localeCompare(a.title));
            response = { data: { results: sortedDesc, total_pages: 1 } };
            break;
          default:
            response = { data: { results: popularMovies, total_pages: 1 } };
            break;
        }
      }

      if (reset) {
        setMovies(response.data?.results || []);
        setCurrentPage(1);
      } else {
        setMovies(prev => [...prev, ...(response.data?.results || [])]);
      }
      
      setTotalPages(response.data?.total_pages || 1);
    } catch (error) {
      console.error('Error fetching filtered movies:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMovies = () => {
    if (currentPage < totalPages && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchFilteredMovies(nextPage, false);
    }
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleMovieClick = async (movie: Movie) => {
    try {
      // Fetch complete movie details with cast/crew if not already present
      if (!movie.cast || !movie.crew) {
        console.log('Fetching complete movie details for:', movie.title);
        const completeMovie = await api.getMovieDetails(movie.id);
        setSelectedMovie(completeMovie.data);
      } else {
        setSelectedMovie(movie);
      }
    } catch (error) {
      console.error('Error fetching complete movie details:', error);
      // Fallback to original movie if fetch fails
    setSelectedMovie(movie);
    }
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
    <div className="min-h-screen bg-black">
      <AnnouncementBar />
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection 
        items={heroMovies}
        loading={heroLoading}
          onItemClick={handleMovieClick}
        />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Movies</h1>
            <p className="text-xl text-gray-400">Discover amazing movies from around the world</p>
          </div>

          {/* Filters */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
        {/* Genre Filter */}
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-gray-400" />
                  <select
                    value={selectedGenre}
                    onChange={(e) => handleGenreChange(e.target.value)}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Genres</option>
          {genres.map((genre) => (
                      <option key={genre.id} value={genre.id.toString()}>
              {genre.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="popularity.desc">Most Popular</option>
                    <option value="vote_average.desc">Highest Rated</option>
                    <option value="release_date.desc">Newest First</option>
                    <option value="title.asc">A-Z</option>
                    <option value="title.desc">Z-A</option>
                  </select>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-800 rounded-md p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
        </div>

          {/* Movies Ad */}
          <div className="mb-8">
            <AdBanner adKey="moviesPageAd" className="max-w-4xl mx-auto" />
          </div>

          {/* Movies Grid */}
        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 20 }).map((_, index) => (
                <div key={index} className="w-full h-96 bg-gray-800 rounded-lg animate-pulse" />
              ))}
          </div>
        ) : (
          <>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                  : 'grid-cols-1 md:grid-cols-2'
              }`}>
                {movies.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    size={viewMode === 'list' ? 'large' : 'medium'}
                onItemClick={handleMovieClick}
              />
                ))}
              </div>

              {/* Load More Button */}
              {currentPage < totalPages && (
                <div className="text-center mt-12">
                  <button
                    onClick={loadMoreMovies}
                    disabled={loadingMore}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-md font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Movies'}
                  </button>
                </div>
              )}
          </>
        )}

          {/* Bottom Movies Ad */}
          <div className="mt-12">
            <AdBanner adKey="moviesPageBottomAd" className="max-w-4xl mx-auto" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
      
      {/* Floating Social Buttons */}
      <FloatingSocialButtons />
    </div>
  );
};

export default Movies; 