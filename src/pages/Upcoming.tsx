import React, { useEffect, useState } from 'react';
import { Filter, Grid, List } from 'lucide-react';
import MovieModal from '@/components/MovieModal';
import MovieCard from '@/components/MovieCard';
import MovieRow from '@/components/MovieRow';
import HeroSection from '@/components/HeroSection';
import Navigation from '@/components/Navigation';
import api, { Movie } from '@/services/api';
import { Loader2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Upcoming = () => {
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('release_date.desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchUpcomingMovies = async () => {
      try {
        setLoading(true);
        setHeroLoading(true);
        const response = await api.getUpcomingMovies();
        const movies = response.data?.results || [];
        
        // Filter to only show truly upcoming movies
        const today = new Date();
        const actuallyUpcoming = movies.filter(movie => 
          new Date(movie.release_date) > today
        );
        
        setUpcomingMovies(actuallyUpcoming);
        setHeroMovies(actuallyUpcoming.slice(0, 5));
      } catch (err) {
        setError('Failed to load upcoming movies');
        console.error(err);
      } finally {
        setLoading(false);
        setHeroLoading(false);
      }
    };
    fetchUpcomingMovies();
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

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    // Apply sorting logic
    const sorted = [...upcomingMovies].sort((a, b) => {
      switch (sort) {
        case 'release_date.asc':
          return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
        case 'release_date.desc':
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        case 'title.asc':
          return a.title.localeCompare(b.title);
        case 'title.desc':
          return b.title.localeCompare(a.title);
        case 'vote_average.desc':
          return b.vote_average - a.vote_average;
        default:
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
      }
    });
    setUpcomingMovies(sorted);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      
      {/* Hero Section with upcoming movies */}
      <HeroSection 
        items={heroMovies}
        loading={heroLoading}
        onItemClick={handleMovieClick}
      />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-yellow-400" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">Upcoming Movies</h1>
              <Badge variant="secondary" className="ml-2 bg-gray-700/80 text-gray-300">
                {upcomingMovies.length} Movies
              </Badge>
            </div>
            <p className="text-xl text-gray-400">Don't miss these exciting new releases coming soon</p>
          </div>

          {/* Filters */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Sort Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="release_date.desc">Release Date (Newest)</option>
                    <option value="release_date.asc">Release Date (Oldest)</option>
                    <option value="vote_average.desc">Highest Rated</option>
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

          {/* Movies Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 20 }).map((_, index) => (
                <div key={index} className="w-full h-96 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : upcomingMovies.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {upcomingMovies.map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  size={viewMode === 'list' ? 'large' : 'medium'}
                  onItemClick={handleMovieClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Upcoming Movies</h3>
              <p className="text-gray-500">Check back later for new releases!</p>
            </div>
          )}
        </div>
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