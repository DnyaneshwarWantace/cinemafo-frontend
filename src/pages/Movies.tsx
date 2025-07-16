import React, { useEffect, useState } from 'react';
import { Filter, Grid, List, Star, Calendar, TrendingUp, X, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MovieModal from '@/components/MovieModal';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import api, { Movie } from '@/services/api';
import { Loader2 } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const Movies = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced filter states
  const [yearFilter, setYearFilter] = useState<string>('any');
  const [ratingFilter, setRatingFilter] = useState<string>('any');
  const [showFilters, setShowFilters] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { settings: adminSettings } = useAdminSettings();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresResponse = await api.getMovieGenres();
        setGenres(genresResponse.data?.genres || []);
      } catch (err) {
        setError('Failed to load genres');
        console.error(err);
      }
    };
    fetchGenres();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trending, popular, topRated] = await Promise.all([
        api.getTrendingMovies(),
        api.getPopularMovies(),
        api.getTopRatedMovies()
      ]);

      setTrendingMovies(trending.data?.results || []);
      setPopularMovies(popular.data?.results || []);
      setTopRatedMovies(topRated.data?.results || []);
      setFilteredMovies(popular.data?.results || []); // Default to popular movies
    } catch (error) {
      console.error('Error fetching movies:', error);
      setError('Failed to load movies. Please try again later.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (selectedGenre !== 'all' || sortBy !== 'popularity.desc' || yearFilter !== 'any' || ratingFilter !== 'any') {
      applyFilters();
    }
  }, [selectedGenre, sortBy, yearFilter, ratingFilter]);

  // Update active filters display
  useEffect(() => {
    const filters: string[] = [];
    if (selectedGenre !== 'all') {
      const genreName = genres.find(g => g.id.toString() === selectedGenre)?.name;
      if (genreName) filters.push(genreName);
    }
    if (yearFilter !== 'any') filters.push(`${yearFilter}`);
    if (ratingFilter !== 'any') filters.push(`${ratingFilter}+ Stars`);
    if (sortBy !== 'popularity.desc') {
      const sortLabels: Record<string, string> = {
        'vote_average.desc': 'Highest Rated',
        'release_date.desc': 'Newest First',
        'title.asc': 'A-Z',
        'title.desc': 'Z-A'
      };
      filters.push(sortLabels[sortBy] || sortBy);
    }
    setActiveFilters(filters);
  }, [selectedGenre, yearFilter, ratingFilter, sortBy, genres]);

  const applyFilters = async () => {
    try {
      let response;
      if (selectedGenre !== 'all') {
        response = await api.getMoviesByGenre(parseInt(selectedGenre));
        let results = response.data?.results || [];
        
        // Apply additional filters
        if (yearFilter !== 'any') {
          results = results.filter(movie => 
            movie.release_date && new Date(movie.release_date).getFullYear().toString() === yearFilter
          );
        }
        
        if (ratingFilter !== 'any') {
          results = results.filter(movie => 
            movie.vote_average >= parseFloat(ratingFilter)
          );
        }
        
        // Apply sorting
        results = sortMovies(results);
        
        setFilteredMovies(results);
      } else {
        // Use existing data based on sort and filters
        let results = [...popularMovies];
        
        // Apply year filter
        if (yearFilter !== 'any') {
          results = results.filter(movie => 
            movie.release_date && new Date(movie.release_date).getFullYear().toString() === yearFilter
          );
        }
        
        // Apply rating filter
        if (ratingFilter !== 'any') {
          results = results.filter(movie => 
            movie.vote_average >= parseFloat(ratingFilter)
          );
        }
        
        // Apply sorting
        results = sortMovies(results);
        
        setFilteredMovies(results);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const sortMovies = (movies: Movie[]) => {
    switch (sortBy) {
      case 'vote_average.desc':
        return [...movies].sort((a, b) => b.vote_average - a.vote_average);
      case 'release_date.desc':
        return [...movies].sort((a, b) => 
          new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        );
      case 'title.asc':
        return [...movies].sort((a, b) => a.title.localeCompare(b.title));
      case 'title.desc':
        return [...movies].sort((a, b) => b.title.localeCompare(a.title));
      default:
        return movies;
    }
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
  };

  const handleSortChange = (sortValue: string) => {
    setSortBy(sortValue);
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const clearAllFilters = () => {
    setSelectedGenre('all');
    setSortBy('popularity.desc');
    setYearFilter('any');
    setRatingFilter('any');
  };

  const removeFilter = (filterToRemove: string) => {
    if (selectedGenre !== 'all' && genres.find(g => g.id.toString() === selectedGenre)?.name === filterToRemove) {
      setSelectedGenre('all');
    } else if (yearFilter === filterToRemove) {
      setYearFilter('any');
    } else if (ratingFilter !== 'any' && `${ratingFilter}+ Stars` === filterToRemove) {
      setRatingFilter('any');
    } else if (sortBy !== 'popularity.desc') {
      const sortLabels: Record<string, string> = {
        'vote_average.desc': 'Highest Rated',
        'release_date.desc': 'Newest First',
        'title.asc': 'A-Z',
        'title.desc': 'Z-A'
      };
      if (sortLabels[sortBy] === filterToRemove) {
        setSortBy('popularity.desc');
      }
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1900; year--) {
      years.push(year);
    }
    return years;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
            Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
                {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Movies</h1>
          <p className="text-xl text-gray-400">Discover amazing movies from around the world</p>
        </div>

        {/* Top Ad */}
        {adminSettings?.ads?.moviesPageAd?.enabled && (
          <div className="mb-8">
            <AdBanner 
              adKey="moviesPageAd"
              imageUrl={adminSettings.ads.moviesPageAd.imageUrl}
              clickUrl={adminSettings.ads.moviesPageAd.clickUrl}
              enabled={adminSettings.ads.moviesPageAd.enabled}
            />
          </div>
        )}

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
                  <option value="all">All Genres</option>
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

        {/* Movies Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Filtered Results */}
            {(selectedGenre !== 'all' || sortBy !== 'popularity.desc' || yearFilter !== 'any' || ratingFilter !== 'any') && (
              <section className="mb-12">
                <MovieCarousel
                  title={`Filtered Movies ${selectedGenre !== 'all' ? `- ${genres.find(g => g.id.toString() === selectedGenre)?.name}` : ''}`}
                  items={filteredMovies}
                  onItemClick={handleMovieClick}
                  viewMode={viewMode}
                />
              </section>
            )}

            {/* Default Sections */}
            {selectedGenre === 'all' && sortBy === 'popularity.desc' && yearFilter === 'any' && ratingFilter === 'any' && (
              <>
                <section className="mb-12">
              <MovieCarousel 
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleMovieClick}
                    viewMode={viewMode}
              />
            </section>

                <section className="mb-12">
              <MovieCarousel 
                title="Popular Movies"
                items={popularMovies}
                onItemClick={handleMovieClick}
                    viewMode={viewMode}
              />
            </section>

                <section className="mb-12">
              <MovieCarousel 
                title="Top Rated Movies"
                items={topRatedMovies}
                onItemClick={handleMovieClick}
                    viewMode={viewMode}
              />
            </section>
          </>
                    )}
          </>
        )}

        {/* Bottom Ad */}
        {adminSettings?.ads?.moviesPageBottomAd?.enabled && (
          <div className="mt-12">
            <AdBanner 
              adKey="moviesPageBottomAd"
              imageUrl={adminSettings.ads.moviesPageBottomAd.imageUrl}
              clickUrl={adminSettings.ads.moviesPageBottomAd.clickUrl}
              enabled={adminSettings.ads.moviesPageBottomAd.enabled}
            />
          </div>
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