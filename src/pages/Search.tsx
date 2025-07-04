import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Calendar, Play, Search as SearchIcon, X, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import TVShowPlayer from "@/components/TVShowPlayer";
import LoadingBar from "@/components/LoadingBar";
import MovieCarousel from "@/components/MovieCarousel";
import api, { Movie, TVShow } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState('multi');

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const searchContent = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.search(debouncedQuery);
        setResults(response.data?.results || []);
      } catch (err) {
        setError('Failed to search content');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    searchContent();
  }, [debouncedQuery]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const handleItemClick = (item: Movie | TVShow) => {
    if ('title' in item) {
      setSelectedMovie(item as Movie);
    } else {
      setSelectedShow(item as TVShow);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <LoadingBar isLoading={loading} />
      {/* Hero Section for Search */}
      <div className="relative h-[40vh] min-h-[200px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Find Your Next
            <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Favorite
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover millions of movies and TV shows. Search by title, genre, or actor.
          </p>
        </div>
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Filters */}
        <div className="flex flex-wrap gap-4 mb-8 p-6 bg-gray-900/80 rounded-lg border border-gray-800">
          <div className="flex gap-4 items-center flex-wrap w-full">
            <div className="relative flex-1 min-w-[300px]">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search movies, TV shows, or people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white pl-10 pr-10 h-12 text-lg"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multi">All</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
                <SelectItem value="person">People</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        {/* Error State */}
        {error && (
          <div className="text-center text-red-500 mb-8">
            {error}
          </div>
        )}
        {/* Search Results */}
        {!loading && results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Search Results for "{query}"
              {results.length > 0 && (
                <span className="text-gray-400 text-lg ml-2">
                  ({results.length} results)
                </span>
              )}
            </h2>
            <MovieCarousel
              title="Results"
              items={results}
              onItemClick={handleItemClick}
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
      {/* TV Show Player */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
      <Footer />
    </div>
  );
};

export default Search; 