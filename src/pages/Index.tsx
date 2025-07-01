import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Play, Star, Calendar, Clock, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import HeroSlider from "@/components/HeroSlider";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import LoadingBar from "@/components/LoadingBar";

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const genres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' }
];

const tvGenres = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' }
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [contentType, setContentType] = useState('movie');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMovies = async (endpoint: string) => {
    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  };

  const fetchFilteredContent = async () => {
    let endpoint = `/discover/${contentType}`;
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: '1',
      sort_by: sortBy,
    });

    if (selectedGenre && selectedGenre !== 'all') params.append('with_genres', selectedGenre);
    if (searchQuery) {
      endpoint = `/search/${contentType}`;
      params.append('query', searchQuery);
    }

    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  };

  const { data: trendingMovies } = useQuery({
    queryKey: ['trending', 'movie'],
    queryFn: () => fetchMovies('/trending/movie/week'),
  });

  const { data: topRatedMovies } = useQuery({
    queryKey: ['topRated', 'movie'],
    queryFn: () => fetchMovies('/movie/top_rated'),
  });

  const { data: popularMovies } = useQuery({
    queryKey: ['popular', 'movie'],
    queryFn: () => fetchMovies('/movie/popular'),
  });

  const { data: trendingTv } = useQuery({
    queryKey: ['trending', 'tv'],
    queryFn: () => fetchMovies('/trending/tv/week'),
  });

  const { data: filteredContent } = useQuery({
    queryKey: ['filtered', contentType, selectedGenre, sortBy, searchQuery],
    queryFn: fetchFilteredContent,
    enabled: !!(selectedGenre !== 'all' || searchQuery),
  });

  const handleMovieClick = (movie: any) => {
    setSelectedMovie(movie);
  };

  const MovieCard = ({ movie, isLarge = false }: { movie: any, isLarge?: boolean }) => (
    <Card 
      className={`${isLarge ? 'min-w-[300px]' : 'min-w-[200px]'} bg-gray-900/50 border-gray-800 card-hover cursor-pointer`}
      onClick={() => handleMovieClick(movie)}
    >
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title || movie.name}
            className={`w-full ${isLarge ? 'h-[450px]' : 'h-[300px]'} object-cover rounded-t-lg`}
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-t-lg" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className={`text-white font-bold ${isLarge ? 'text-lg' : 'text-sm'} mb-2 line-clamp-2`}>
              {movie.title || movie.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{movie.vote_average?.toFixed(1)}</span>
              <Calendar className="w-3 h-3 ml-2" />
              <span>{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
            </div>
          </div>
          <Button 
            size="sm" 
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700"
            onClick={(e) => {
              e.stopPropagation();
              handleMovieClick(movie);
            }}
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MovieSection = ({ title, movies, isLarge = false }: { title: string, movies: any[], isLarge?: boolean }) => (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {movies?.map((movie) => (
          <MovieCard key={movie.id} movie={movie} isLarge={isLarge} />
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-black">
      <LoadingBar isLoading={isLoading} />
      <Navigation />
      
      {/* Hero Slider */}
      <HeroSlider movies={trendingMovies?.results?.slice(0, 5) || []} onMovieClick={handleMovieClick} />

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 bg-gray-900/30 p-6 rounded-lg border border-gray-800">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Filters:</span>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="movie">Movies</SelectItem>
                  <SelectItem value="tv">TV Shows</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                  <SelectItem value="all">All Genres</SelectItem>
                  {(contentType === 'movie' ? genres : tvGenres).map((genre) => (
                    <SelectItem key={genre.id} value={genre.id.toString()}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="popularity.desc">Most Popular</SelectItem>
                  <SelectItem value="vote_average.desc">Highest Rated</SelectItem>
                  <SelectItem value="release_date.desc">Newest</SelectItem>
                  <SelectItem value="revenue.desc">Highest Grossing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[250px]">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search movies & TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filtered Results */}
        {(selectedGenre !== 'all' || searchQuery) && filteredContent?.results && (
          <MovieSection 
            title={searchQuery ? `Search Results for "${searchQuery}"` : `${contentType === 'movie' ? 'Movies' : 'TV Shows'} - ${genres.find(g => g.id.toString() === selectedGenre)?.name || tvGenres.find(g => g.id.toString() === selectedGenre)?.name}`}
            movies={filteredContent.results}
            isLarge={true}
          />
        )}

        {/* Movie Sections */}
        {!searchQuery && selectedGenre === 'all' && (
          <>
            <MovieSection title="Trending Movies" movies={trendingMovies?.results || []} isLarge={true} />
            <MovieSection title="Top Rated Movies" movies={topRatedMovies?.results || []} />
            <MovieSection title="Popular Movies" movies={popularMovies?.results || []} />
            <MovieSection title="Trending TV Shows" movies={trendingTv?.results || []} />
          </>
        )}
      </div>

      <Footer />
      
      {selectedMovie && (
        <MovieModal 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      )}
    </div>
  );
};

export default Index;
