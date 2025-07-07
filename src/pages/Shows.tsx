import React, { useEffect, useState } from 'react';
import { Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/HeroSection';
import MovieRow from '@/components/MovieRow';
import MovieCard from '@/components/MovieCard';
import Navigation from '@/components/Navigation';
import api, { TVShow } from '@/services/api';
import { Loader2, Tv, Film, Zap, Heart, Star } from 'lucide-react';
import TVShowPlayer from "@/components/TVShowPlayer";

const Shows = () => {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [heroShows, setHeroShows] = useState<TVShow[]>([]);
  const [webSeries, setWebSeries] = useState<TVShow[]>([]);
  const [crimeDramas, setCrimeDramas] = useState<TVShow[]>([]);
  const [sciFiFantasy, setSciFiFantasy] = useState<TVShow[]>([]);
  const [comedySeries, setComedySeries] = useState<TVShow[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setHeroLoading(true);
        const [
          genresResponse, 
          showsResponse, 
          webSeriesResponse, 
          crimeDramasResponse, 
          sciFiFantasyResponse, 
          comedySeriesResponse
        ] = await Promise.all([
          api.getTVGenres(),
          api.getPopularShows(),
          api.getWebSeries(),
          api.getCrimeDramas(),
          api.getSciFiFantasy(),
          api.getComedySeries()
        ]);
        
        const popularResults = showsResponse.data?.results || [];
        
        setGenres(genresResponse.data?.genres || []);
        setShows(popularResults);
        setHeroShows(popularResults.slice(0, 5)); // Set hero shows from popular
        setWebSeries(webSeriesResponse.data?.results || []);
        setCrimeDramas(crimeDramasResponse.data?.results || []);
        setSciFiFantasy(sciFiFantasyResponse.data?.results || []);
        setComedySeries(comedySeriesResponse.data?.results || []);
      } catch (err) {
        setError('Failed to load TV shows');
        console.error(err);
      } finally {
        setLoading(false);
        setHeroLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchShowsByGenre = async () => {
      if (!selectedGenre) return;
      try {
        setLoading(true);
        const response = await api.getShowsByGenre(parseInt(selectedGenre));
        setShows(response.data?.results || []);
      } catch (err) {
        setError('Failed to load TV shows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShowsByGenre();
  }, [selectedGenre]);

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    // Apply sorting logic here if needed
  };

  const handleShowClick = (item: TVShow) => {
    setSelectedShow(item);
  };

  // Handle custom events from "More Like This" clicks
  useEffect(() => {
    const handleOpenShowModal = (event: any) => {
      const show = event.detail;
      handleShowClick(show);
    };

    window.addEventListener('openShowModal', handleOpenShowModal);

    return () => {
      window.removeEventListener('openShowModal', handleOpenShowModal);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection 
        items={heroShows}
        loading={heroLoading}
        onItemClick={handleShowClick}
      />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TV Shows</h1>
            <p className="text-xl text-gray-400">Discover amazing TV shows and series from around the world</p>
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
                    <option value="first_air_date.desc">Newest First</option>
                    <option value="name.asc">A-Z</option>
                    <option value="name.desc">Z-A</option>
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

          {/* Shows Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 20 }).map((_, index) => (
                <div key={index} className="w-full h-96 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {shows.map((show) => (
                <MovieCard 
                  key={show.id} 
                  movie={{...show, title: show.name, release_date: show.first_air_date}} 
                  size={viewMode === 'list' ? 'large' : 'medium'}
                  onItemClick={(movie) => handleShowClick({...show, name: movie.title || movie.name || show.name})}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Sections - Show as rows if not using grid/list view */}
      <div className="relative z-10 space-y-12 pb-16">
        {/* Web Series */}
        {webSeries.length > 0 && (
          <MovieRow
            title="Web Series"
            movies={webSeries}
            onItemClick={handleShowClick}
          />
        )}

        {/* Crime Dramas */}
        {crimeDramas.length > 0 && (
          <MovieRow
            title="Crime Dramas & Thrillers"
            movies={crimeDramas}
            onItemClick={handleShowClick}
          />
        )}

        {/* Sci-Fi & Fantasy */}
        {sciFiFantasy.length > 0 && (
          <MovieRow
            title="Sci-Fi & Fantasy"
            movies={sciFiFantasy}
            onItemClick={handleShowClick}
          />
        )}

        {/* Comedy Series */}
        {comedySeries.length > 0 && (
          <MovieRow
            title="Comedy Series"
            movies={comedySeries}
            onItemClick={handleShowClick}
          />
        )}
      </div>

      {/* TV Show Player */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </div>
  );
};

export default Shows; 