import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Calendar, Play, Search as SearchIcon, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import TVShowPlayer from "@/components/TVShowPlayer";
import LoadingBar from "@/components/LoadingBar";
import api, { Movie, TVShow } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [showTVPlayer, setShowTVPlayer] = useState(false);
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
        setResults(response.data.results);
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
    // Check if it's a TV show using media_type or fallback to name/title check
    const isTVShow = item.media_type === 'tv' || ('name' in item && !('title' in item));
    
    if (isTVShow) {
      setSelectedItem(item);
      setShowTVPlayer(true);
    } else {
      setSelectedItem(item);
      setShowTVPlayer(false);
    }
  };

  const MediaCard = ({ item }: { item: Movie | TVShow }) => (
    <Card 
      className="w-[200px] bg-gray-900/50 border-gray-800 card-hover cursor-pointer flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-gray-800/70"
      onClick={() => handleItemClick(item)}
    >
      <CardContent className="p-0 relative">
        <div className="relative aspect-[2/3] w-full">
          <img
            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
            alt={item.title || item.name}
            className="w-full h-full object-cover rounded-t-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-t-lg" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">
              {item.title || item.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{item.vote_average?.toFixed(1)}</span>
              {(item.release_date || item.first_air_date) && (
                <>
                  <Calendar className="w-3 h-3 ml-2" />
                  <span>{new Date(item.release_date || item.first_air_date).getFullYear()}</span>
                </>
              )}
            </div>
            <div className="text-xs text-purple-400 mt-1 capitalize">
              {item.media_type || mediaType}
            </div>
          </div>
          <Button 
            size="sm" 
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(item);
            }}
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <LoadingBar isLoading={loading} />
      
      {/* Hero Section for Search */}
      <div className="relative h-screen flex items-center justify-center">
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

      <div className="container mx-auto px-4 py-8">
        {/* Simple Netflix-style Search Filters */}
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {results.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {!query && (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold text-white mb-4">
              What would you like to watch?
            </h2>
            <p className="text-gray-400 text-lg">
              Start typing to search for movies, TV shows, or people
            </p>
          </div>
        )}
      </div>

      <Footer />
      
      {/* Show either MovieModal or TVShowPlayer based on the content type */}
      {selectedItem && !showTVPlayer && (
        <MovieModal 
          movie={selectedItem}
          onClose={() => setSelectedItem(null)} 
        />
      )}
      
      {selectedItem && showTVPlayer && (
        <TVShowPlayer
          show={selectedItem as TVShow}
          onClose={() => {
            setSelectedItem(null);
            setShowTVPlayer(false);
          }}
        />
      )}
    </div>
  );
};

export default Search; 