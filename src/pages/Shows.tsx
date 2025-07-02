import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Calendar, Play, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MovieModal from "@/components/MovieModal";
import LoadingBar from "@/components/LoadingBar";
import HeroSlider from "@/components/HeroSlider";

const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

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

const Shows = () => {
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchShows = async (endpoint: string) => {
    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  };

  const fetchFilteredShows = async () => {
    let endpoint = `/discover/tv`;
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: '1',
      sort_by: sortBy,
    });

    if (selectedGenre && selectedGenre !== 'all') {
      params.append('with_genres', selectedGenre);
    }

    if (searchQuery) {
      endpoint = `/search/tv`;
      params.append('query', searchQuery);
    }

    const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  };

  const { data: popularShows } = useQuery({
    queryKey: ['popular', 'tv'],
    queryFn: () => fetchShows('/tv/popular'),
  });

  const { data: topRatedShows } = useQuery({
    queryKey: ['topRated', 'tv'],
    queryFn: () => fetchShows('/tv/top_rated'),
  });

  const { data: airingTodayShows } = useQuery({
    queryKey: ['airingToday', 'tv'],
    queryFn: () => fetchShows('/tv/airing_today'),
  });

  const { data: onTheAirShows } = useQuery({
    queryKey: ['onTheAir', 'tv'],
    queryFn: () => fetchShows('/tv/on_the_air'),
  });

  const { data: filteredShows } = useQuery({
    queryKey: ['filtered', 'tv', selectedGenre, sortBy, searchQuery],
    queryFn: fetchFilteredShows,
    enabled: !!(selectedGenre !== 'all' || searchQuery),
  });

  const handleShowClick = (show: any) => {
    setSelectedShow(show);
  };

  const ShowCard = ({ show, isLarge = false }: { show: any, isLarge?: boolean }) => (
    <Card 
      className={`${isLarge ? 'w-[300px]' : 'w-[200px]'} bg-gray-900/50 border-gray-800 card-hover cursor-pointer flex-shrink-0 transition-all duration-300 hover:scale-105 hover:bg-gray-800/70`}
      onClick={() => handleShowClick(show)}
    >
      <CardContent className="p-0 relative">
        <div className="relative aspect-[2/3] w-full">
          <img
            src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
            alt={show.name}
            className="w-full h-full object-cover rounded-t-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-t-lg" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className={`text-white font-bold ${isLarge ? 'text-lg' : 'text-sm'} mb-2 line-clamp-2`}>
              {show.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Star className="w-3 h-3 text-yellow-400" />
              <span>{show.vote_average?.toFixed(1)}</span>
              <Calendar className="w-3 h-3 ml-2" />
              <span>{new Date(show.first_air_date).getFullYear()}</span>
            </div>
          </div>
          <Button 
            size="sm" 
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleShowClick(show);
            }}
          >
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ShowSection = ({ title, shows, isLarge = false }: { title: string, shows: any[], isLarge?: boolean }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 6;
    const totalPages = Math.ceil((shows?.length || 0) / itemsPerPage);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const newPage = direction === 'left' 
          ? Math.max(0, currentPage - 1)
          : Math.min(totalPages - 1, currentPage + 1);
        
        setCurrentPage(newPage);
        const cardWidth = isLarge ? 300 : 200;
        const gap = 16;
        const scrollAmount = newPage * (cardWidth + gap) * itemsPerPage;
        scrollRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    return (
      <section className="mb-12 relative group pt-4">
        <h2 className="text-2xl font-bold text-white mb-6 pl-4">{title}</h2>
        <div className="relative">
          {currentPage > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-hidden pb-4 relative px-4"
            style={{
              maskImage: 'linear-gradient(to right, black 95%, transparent 98%)',
              WebkitMaskImage: 'linear-gradient(to right, black 95%, transparent 98%)'
            }}
          >
            {shows?.map((show) => (
              <ShowCard key={show.id} show={show} isLarge={isLarge} />
            ))}
          </div>

          {currentPage < totalPages - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <LoadingBar isLoading={isLoading} />
      
      {/* Hero Slider for TV Shows */}
      <HeroSlider movies={popularShows?.results?.slice(0, 5) || []} onMovieClick={handleShowClick} />

      <div className="container mx-auto px-4 py-8">
        {/* Simple Netflix-style Filters */}
        <div className="flex flex-wrap gap-4 mb-8 p-6 bg-gray-900/80 rounded-lg border border-gray-800">
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {tvGenres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.id.toString()}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity.desc">Popular</SelectItem>
                <SelectItem value="vote_average.desc">Top Rated</SelectItem>
                <SelectItem value="first_air_date.desc">Latest</SelectItem>
                <SelectItem value="first_air_date.asc">Oldest</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white pl-10 pr-10"
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
          </div>
        </div>

        {/* Filtered Results */}
        {(selectedGenre !== 'all' || searchQuery) && filteredShows?.results && (
          <ShowSection 
            title={searchQuery ? `Search Results for "${searchQuery}"` : `${tvGenres.find(g => g.id.toString() === selectedGenre)?.name} Shows`}
            shows={filteredShows.results}
            isLarge={true}
          />
        )}

        {/* TV Show Sections */}
        {!searchQuery && selectedGenre === 'all' && (
          <>
            <ShowSection title="🔥 Popular TV Shows" shows={popularShows?.results || []} isLarge={true} />
            <ShowSection title="⭐ Top Rated TV Shows" shows={topRatedShows?.results || []} />
            <ShowSection title="📺 On The Air" shows={onTheAirShows?.results || []} />
            <ShowSection title="📅 Airing Today" shows={airingTodayShows?.results || []} />
          </>
        )}
      </div>

      <Footer />
      
      {selectedShow && (
        <MovieModal 
          movie={selectedShow} 
          onClose={() => setSelectedShow(null)} 
        />
      )}
    </div>
  );
};

export default Shows; 