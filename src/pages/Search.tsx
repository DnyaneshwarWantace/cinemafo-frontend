import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Calendar, Play, Search as SearchIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import LoadingBar from "@/components/LoadingBar";

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState('multi');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchContent = async () => {
    if (!searchQuery.trim()) return { results: [] };
    
    const endpoint = mediaType === 'multi' ? '/search/multi' : `/search/${mediaType}`;
    const response = await fetch(
      `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1&query=${encodeURIComponent(searchQuery)}`
    );
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  };

  const { data: searchResults, isError } = useQuery({
    queryKey: ['search', searchQuery, mediaType],
    queryFn: searchContent,
    enabled: !!searchQuery.trim(),
  });

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
  };

  const MediaCard = ({ item }: { item: any }) => (
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
      <LoadingBar isLoading={isLoading} />
      
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white pl-10 pr-10 h-12 text-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
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

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Search Results for "{searchQuery}"
              {searchResults?.total_results && (
                <span className="text-gray-400 text-lg ml-2">
                  ({searchResults.total_results} results)
                </span>
              )}
            </h2>
            
            {searchResults?.results?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {searchResults.results
                  .filter(item => item.poster_path)
                  .map((item) => (
                    <MediaCard key={`${item.id}-${item.media_type}`} item={item} />
                  ))}
              </div>
            ) : searchResults && searchResults.results?.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-xl mb-4">No results found</div>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Welcome Message */}
        {!searchQuery && (
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
      
      {selectedItem && (
        <MovieModal 
          movie={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default Search; 