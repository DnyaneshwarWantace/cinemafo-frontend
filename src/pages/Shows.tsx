import React, { useEffect, useState } from 'react';
import { Filter, Grid, List, Star, Calendar, TrendingUp, X, RefreshCw, Eye, EyeOff, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import MovieModal from '@/components/MovieModal';
import MovieCarousel from '@/components/MovieCarousel';
import AdBanner from '@/components/AdBanner';
import TVShowPlayer from '@/components/TVShowPlayer';
import api, { TVShow } from '@/services/api';
import { Loader2 } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const Shows = () => {
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [topRatedShows, setTopRatedShows] = useState<TVShow[]>([]);
  const [filteredShows, setFilteredShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced filter states
  const [yearFilter, setYearFilter] = useState<string>('any');
  const [ratingFilter, setRatingFilter] = useState<string>('any');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const { settings: adminSettings } = useAdminSettings();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genresResponse = await api.getTVGenres();
        setGenres(genresResponse.data?.genres || []);
      } catch (err) {
        setError('Failed to load genres');
        console.error(err);
      }
    };
    fetchGenres();
  }, []);

  const fetchShows = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trending, popular, topRated] = await Promise.all([
        api.getTrendingShows(),
        api.getPopularShows(),
        api.getTopRatedShows()
      ]);

      setTrendingShows(trending.data?.results || []);
      setPopularShows(popular.data?.results || []);
      setTopRatedShows(topRated.data?.results || []);
      setFilteredShows(popular.data?.results || []); // Default to popular shows
    } catch (error) {
      console.error('Error fetching TV shows:', error);
      setError('Failed to load TV shows. Please try again later.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShows();
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
        'first_air_date.desc': 'Newest First',
        'name.asc': 'A-Z',
        'name.desc': 'Z-A'
      };
      filters.push(sortLabels[sortBy] || sortBy);
    }
    setActiveFilters(filters);
  }, [selectedGenre, yearFilter, ratingFilter, sortBy, genres]);

  const applyFilters = async () => {
    try {
      let response;
      if (selectedGenre !== 'all') {
        response = await api.getShowsByGenre(parseInt(selectedGenre));
        let results = response.data?.results || [];
        
        // Apply additional filters
        if (yearFilter !== 'any') {
          results = results.filter(show => 
            show.first_air_date && new Date(show.first_air_date).getFullYear().toString() === yearFilter
          );
        }
        
        if (ratingFilter !== 'any') {
          results = results.filter(show => 
            show.vote_average >= parseFloat(ratingFilter)
          );
        }
        
        // Apply sorting
        results = sortShows(results);
        
        setFilteredShows(results);
      } else {
        // Use existing data based on sort and filters
        let results = [...popularShows];
        
        // Apply year filter
        if (yearFilter !== 'any') {
          results = results.filter(show => 
            show.first_air_date && new Date(show.first_air_date).getFullYear().toString() === yearFilter
          );
        }
        
        // Apply rating filter
        if (ratingFilter !== 'any') {
          results = results.filter(show => 
            show.vote_average >= parseFloat(ratingFilter)
          );
        }
        
        // Apply sorting
        results = sortShows(results);
        
        setFilteredShows(results);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const sortShows = (shows: TVShow[]) => {
    switch (sortBy) {
      case 'vote_average.desc':
        return [...shows].sort((a, b) => b.vote_average - a.vote_average);
      case 'first_air_date.desc':
        return [...shows].sort((a, b) => 
          new Date(b.first_air_date).getTime() - new Date(a.first_air_date).getTime()
        );
      case 'name.asc':
        return [...shows].sort((a, b) => a.name.localeCompare(b.name));
      case 'name.desc':
        return [...shows].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return shows;
    }
  };

  const handleGenreChange = (genreId: string) => {
    setSelectedGenre(genreId);
  };

  const handleSortChange = (sortValue: string) => {
    setSortBy(sortValue);
  };

  const handleShowClick = (show: TVShow) => {
    setSelectedShow(show);
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
        'first_air_date.desc': 'Newest First',
        'name.asc': 'A-Z',
        'name.desc': 'Z-A'
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
      {/* Mobile Header - Netflix Style */}
      <div className="lg:hidden">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">TV Shows</h1>
          <p className="text-gray-400 text-sm">Discover amazing TV shows from around the world</p>
        </div>

        {/* Mobile Filter Button */}
        <div className="px-4 mb-4">
          <button 
            onClick={() => setShowFilterDrawer(true)}
            className="w-full bg-gray-800/50 border border-gray-600 text-white hover:bg-gray-700/50 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-600 text-white text-xs">
                {activeFilters.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Mobile Active Filters */}
        {activeFilters.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter}
                  variant="secondary"
                  className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30 cursor-pointer text-xs"
                  onClick={() => removeFilter(filter)}
                >
                  {filter}
                  <X size={10} className="ml-1" />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
          </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">TV Shows</h1>
            <p className="text-xl text-gray-400">Discover amazing TV shows from around the world</p>
            </div>

          {/* Desktop Filters */}
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
        </div>
      </div>

      {/* Mobile Content - Netflix Style */}
      <div className="lg:hidden">
        {/* Top Ad */}
        {adminSettings?.ads?.showsPageAd?.enabled && (
          <div className="px-4 mb-6">
            <AdBanner 
              adKey="showsPageAd" 
              imageUrl={adminSettings.ads.showsPageAd.imageUrl}
              clickUrl={adminSettings.ads.showsPageAd.clickUrl}
              enabled={adminSettings.ads.showsPageAd.enabled}
            />
          </div>
        )}

        {/* Shows Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh] px-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Filtered Results */}
            {(selectedGenre !== 'all' || sortBy !== 'popularity.desc' || yearFilter !== 'any' || ratingFilter !== 'any') && (
              <section>
          <MovieCarousel
                  title={`Filtered TV Shows ${selectedGenre !== 'all' ? `- ${genres.find(g => g.id.toString() === selectedGenre)?.name}` : ''}`}
                  items={filteredShows}
            onItemClick={handleShowClick}
                  viewMode="grid"
          />
              </section>
            )}

            {/* Default Sections */}
            {selectedGenre === 'all' && sortBy === 'popularity.desc' && yearFilter === 'any' && ratingFilter === 'any' && (
              <>
                <section>
              <MovieCarousel
                    title="Trending TV Shows"
                    items={trendingShows}
                onItemClick={handleShowClick}
                    viewMode="grid"
              />
                </section>

                <section>
              <MovieCarousel
                    title="Popular TV Shows"
                    items={popularShows}
                onItemClick={handleShowClick}
                    viewMode="grid"
              />
                </section>

                <section>
              <MovieCarousel
                    title="Top Rated TV Shows"
                    items={topRatedShows}
                onItemClick={handleShowClick}
                    viewMode="grid"
              />
                </section>
              </>
            )}

            {/* Bottom Ad */}
            {adminSettings?.ads?.showsPageBottomAd?.enabled && (
              <div className="px-4">
                <AdBanner 
                  adKey="showsPageBottomAd" 
                  imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                  clickUrl={adminSettings.ads.showsPageBottomAd.clickUrl}
                  enabled={adminSettings.ads.showsPageBottomAd.enabled}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Content */}
      <div className="hidden lg:block">
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8">
          {/* Top Ad */}
          {adminSettings?.ads?.showsPageAd?.enabled && (
            <div className="mb-8">
              <AdBanner 
                adKey="showsPageAd" 
                imageUrl={adminSettings.ads.showsPageAd.imageUrl}
                clickUrl={adminSettings.ads.showsPageAd.clickUrl}
                enabled={adminSettings.ads.showsPageAd.enabled}
              />
            </div>
          )}

          {/* Shows Content */}
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
                    title={`Filtered TV Shows ${selectedGenre !== 'all' ? `- ${genres.find(g => g.id.toString() === selectedGenre)?.name}` : ''}`}
                    items={filteredShows}
                    onItemClick={handleShowClick}
                    viewMode={viewMode}
                  />
                </section>
              )}

              {/* Default Sections */}
              {selectedGenre === 'all' && sortBy === 'popularity.desc' && yearFilter === 'any' && ratingFilter === 'any' && (
                <>
                  <section className="mb-12">
                    <MovieCarousel
                      title="Trending TV Shows"
                      items={trendingShows}
                      onItemClick={handleShowClick}
                      viewMode={viewMode}
                    />
                  </section>

                  <section className="mb-12">
                    <MovieCarousel
                      title="Popular TV Shows"
                      items={popularShows}
                      onItemClick={handleShowClick}
                      viewMode={viewMode}
                    />
                  </section>

                  <section className="mb-12">
                    <MovieCarousel
                      title="Top Rated TV Shows"
                      items={topRatedShows}
                      onItemClick={handleShowClick}
                      viewMode={viewMode}
              />
                </section>
              </>
            )}
          </>
        )}

        {/* Bottom Ad */}
          {adminSettings?.ads?.showsPageBottomAd?.enabled && (
        <div className="mt-12">
          <AdBanner 
            adKey="showsPageBottomAd" 
                imageUrl={adminSettings.ads.showsPageBottomAd.imageUrl}
                clickUrl={adminSettings.ads.showsPageBottomAd.clickUrl}
                enabled={adminSettings.ads.showsPageBottomAd.enabled}
          />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFilterDrawer(false)}
          />
          
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Filters</h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Genre Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="popularity.desc">Most Popular</option>
                <option value="vote_average.desc">Highest Rated</option>
                <option value="first_air_date.desc">Newest First</option>
                <option value="name.asc">A-Z</option>
                <option value="name.desc">Z-A</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="any">Any Year</option>
                {generateYearOptions().map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Minimum Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="any">Any Rating</option>
                <option value="9">9+ Stars</option>
                <option value="8">8+ Stars</option>
                <option value="7">7+ Stars</option>
                <option value="6">6+ Stars</option>
                <option value="5">5+ Stars</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={clearAllFilters}
                variant="outline"
                className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setShowFilterDrawer(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

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