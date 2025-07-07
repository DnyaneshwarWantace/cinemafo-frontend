import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import MovieCard from '@/components/MovieCard';
import AdSpot from '@/components/AdSpot';
import api, { Movie } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface Genre {
  id: number;
  name: string;
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    rating: '',
  });

  useEffect(() => {
    fetchGenres();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMovies();
        setShowHistory(false);
      } else {
        setMovies([]);
        setShowHistory(searchHistory.length > 0);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const fetchGenres = async () => {
    try {
      const response = await api.getMovieGenres();
      setGenres(response.data?.genres || []);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const loadSearchHistory = () => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      const parsedHistory = JSON.parse(history);
      setSearchHistory(parsedHistory);
      setShowHistory(parsedHistory.length > 0 && !searchQuery);
    }
  };

  const saveSearchHistory = (query: string) => {
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const searchMovies = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await api.search(searchQuery);
      setMovies(response.data?.results || []);
      saveSearchHistory(searchQuery);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFromHistory = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    setShowHistory(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setMovies([]);
    setShowHistory(searchHistory.length > 0);
  };

  const handleSearchFocus = () => {
    if (!searchQuery && searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow clicks on history items
    setTimeout(() => setShowHistory(false), 200);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Search</h1>
            <p className="text-xl text-gray-400">Find your favorite movies and shows</p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder="Search for movies..."
                className="w-full bg-gray-900/50 backdrop-blur-sm text-white pl-12 pr-12 py-4 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none text-lg transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              )}
            </div>

            {/* Search Suggestions/History */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-b-xl mt-1 z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400">Recent Searches</h3>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchFromHistory(query)}
                      className="block w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md text-sm transition-colors"
                    >
                      <SearchIcon className="inline w-4 h-4 mr-2 text-gray-500" />
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filters Toggle */}
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Filter size={18} />
              Filters
              {showFilters && <span className="text-xs bg-blue-600 px-2 py-1 rounded-full ml-2">Open</span>}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
                  <select
                    value={filters.genre}
                    onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Genres</option>
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.id.toString()}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Year</label>
                  <input
                    type="number"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    placeholder="e.g. 2023"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Rating</label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Any Rating</option>
                    <option value="9">9+ Stars</option>
                    <option value="8">8+ Stars</option>
                    <option value="7">7+ Stars</option>
                    <option value="6">6+ Stars</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Searching...</p>
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Search Results for "{searchQuery}"
                </h2>
                <p className="text-gray-400 mt-1">{movies.length} movies found</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {movies.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie}
                    size="medium"
                  />
                ))}
              </div>
            </>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <SearchIcon size={48} className="mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
              <p className="text-gray-500">Try searching with different keywords or check your spelling</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <SearchIcon size={48} className="mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">Start searching</h3>
              <p className="text-gray-500">Enter a movie title, actor, or keyword to get started</p>
            </div>
          )}
        </div>
        
        {/* Search Page Ad 2 */}
        <AdSpot adKey="searchPageAd2" />
      </div>
    </div>
  );
};

export default Search; 