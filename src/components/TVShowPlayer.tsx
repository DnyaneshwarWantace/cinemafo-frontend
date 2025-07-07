import React, { useState, useEffect } from 'react';
import { Play, Plus, Star, ArrowLeft, Calendar, Clock, Globe, Check } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import VideoPlayer from '@/components/VideoPlayer';
import MovieCard from './MovieCard';
import MovieRow from './MovieRow';
import Navigation from './Navigation';
import api, { TVShow, Movie } from '@/services/api';

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  overview: string;
  poster_path: string;
  air_date?: string;
  id?: number;
  episodes?: Episode[];
}

interface TVShowPlayerProps {
  show: TVShow;
  onClose: () => void;
}

const TVShowPlayer: React.FC<TVShowPlayerProps> = ({ show, onClose }) => {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inWatchlist = isInWatchlist(show.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [similarShows, setSimilarShows] = useState<Movie[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [detailedShow, setDetailedShow] = useState<TVShow>(show);

  useEffect(() => {
    // Fetch detailed show information
    const fetchDetailedShow = async () => {
      try {
        const response = await api.getShowDetails(show.id);
        const detailedData = response.data;
        if (detailedData) {
          setDetailedShow(detailedData);
        }
      } catch (error) {
        console.error('Error fetching detailed show:', error);
        // Use original show data as fallback
        setDetailedShow(show);
      }
    };

    fetchDetailedShow();
  }, [show.id]);

  useEffect(() => {
    // Set first season as default - with better error handling
    if (detailedShow.seasons && detailedShow.seasons.length > 0) {
      const validSeasons = detailedShow.seasons.filter(s => s.season_number > 0);
      const firstSeason = validSeasons.length > 0 ? validSeasons[0] : detailedShow.seasons[0];
      setSelectedSeason(firstSeason);
    } else if (detailedShow.number_of_seasons && detailedShow.number_of_seasons > 0) {
      // Create a default season if seasons array is missing
      const defaultSeason: Season = {
        season_number: 1,
        name: 'Season 1',
        episode_count: 10,
        overview: `Season 1 of ${detailedShow.name}`,
        poster_path: detailedShow.poster_path,
        air_date: detailedShow.first_air_date
      };
      setSelectedSeason(defaultSeason);
    }
  }, [detailedShow]);

  useEffect(() => {
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Load similar shows (using movies as fallback)
    loadSimilarShows();
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, show.id]);

  const loadSimilarShows = async () => {
    try {
      setLoadingSimilar(true);
      // Using popular shows as similar shows since API might not have specific similar TV shows endpoint
      const response = await api.getPopularShows();
      const filtered = response.data?.results?.filter((s: any) => s.id !== show.id).slice(0, 12) || [];
      setSimilarShows(filtered);
    } catch (error) {
      console.error('Error loading similar shows:', error);
      setSimilarShows([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleBackClick = () => {
    onClose();
  };

  const handleWatchEpisodes = () => {
    // Play first episode of first season
    if (selectedSeason && episodes.length > 0) {
      setSelectedEpisode(episodes[0]);
      setIsPlaying(true);
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsPlaying(true);
  };

  const handleToggleWatchlist = () => {
    toggleWatchlist(displayShow, 'tv');
  };

  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  const profileBaseUrl = 'https://image.tmdb.org/t/p/w185';
  
  // Use detailed show data for display
  const displayShow = detailedShow;
  const title = displayShow.name || 'Unknown Title';
  const releaseDate = displayShow.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const rating = Math.round(displayShow.vote_average * 10) / 10;
  const averageRuntime = (displayShow as any).episode_run_time?.[0] || 45;
  const runtime = `${Math.floor(averageRuntime / 60)}h ${averageRuntime % 60}m avg`;

  // Use real data from the show object or provide fallbacks
  const creator = (displayShow as any).created_by?.[0];
  const mainCast = displayShow.cast?.slice(0, 8) || [];
  
  // Debug log to see what data we're getting
  console.log('Show data:', displayShow);
  console.log('Cast data:', displayShow.cast);
  console.log('Crew data:', displayShow.crew);
  console.log('Selected season:', selectedSeason);
  console.log('Number of seasons:', displayShow.number_of_seasons);
  console.log('Seasons array:', displayShow.seasons);

  // Mock episodes for selected season since they might not be pre-fetched
  const mockEpisodes: Episode[] = selectedSeason ? Array.from({ length: selectedSeason.episode_count || 10 }, (_, i) => ({
    id: i + 1,
    name: `Episode ${i + 1}`,
    overview: `Episode ${i + 1} of ${selectedSeason.name}`,
    episode_number: i + 1,
    season_number: selectedSeason.season_number,
    still_path: null,
    air_date: displayShow.first_air_date,
    runtime: averageRuntime,
    vote_average: displayShow.vote_average
  })) : [];

  const episodes = selectedSeason?.episodes || mockEpisodes;

  // If playing, show video player
  if (isPlaying) {
    return (
      <VideoPlayer
        tmdbId={displayShow.id}
        title={title}
        type="tv"
        onClose={() => setIsPlaying(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {/* Navigation Bar */}
      <Navigation />
      
      {/* Hero Section - Added proper top padding */}
      <div className="relative pt-20">
        {/* Background Image */}
        <div className="h-screen relative overflow-hidden">
          <img
            src={`${imageBaseUrl}${displayShow.backdrop_path || displayShow.poster_path}`}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        </div>

        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="absolute top-24 left-4 md:left-12 z-10 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Content */}
        <div className="absolute inset-0 flex items-center pt-48 pb-32">
          <div className="max-w-7xl mx-auto px-4 md:px-12 w-full">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Show Poster */}
              <div className="flex-shrink-0">
                <img
                  src={`${posterBaseUrl}${displayShow.poster_path}`}
                  alt={title}
                  className="w-72 lg:w-80 rounded-lg shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-poster.jpg';
                  }}
                />
              </div>

              {/* Show Details */}
              <div className="flex-1 max-w-3xl mt-8 lg:mt-0">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {title}
                </h1>

                {displayShow.tagline && (
                  <p className="text-xl text-gray-300 mb-6 italic">"{displayShow.tagline}"</p>
                )}

                {/* Show Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span>{runtime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="text-yellow-400 fill-yellow-400" size={18} />
                    <span className="font-medium">{rating}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={18} />
                    <span>{displayShow.spoken_languages?.[0]?.name || 'English'}</span>
                  </div>
                </div>

                {/* Genres */}
                {displayShow.genres && displayShow.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {displayShow.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="bg-gray-800/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                <p className="text-lg text-gray-200 mb-8 leading-relaxed">
                  {displayShow.overview || 'No overview available for this show.'}
                </p>

                {/* Cast Section - Moved here and improved */}
                {mainCast.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Starring</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {mainCast.map((actor) => (
                        <div key={actor.id} className="text-center">
                          <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-gray-800">
                            {actor.profile_path ? (
                              <img
                                src={`${profileBaseUrl}${actor.profile_path}`}
                                alt={actor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Photo</span>
                              </div>
                            )}
                          </div>
                          <h4 className="text-white font-medium text-sm mb-1">{actor.name}</h4>
                          <p className="text-gray-400 text-xs">{actor.character}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <button 
                    onClick={handleWatchEpisodes}
                    className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-md text-lg font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform"
                  >
                    <Play size={24} />
                    Watch Episodes
                  </button>
                  
                  <button 
                    onClick={handleToggleWatchlist}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-md text-lg font-semibold transition-all duration-200 hover:scale-105 transform backdrop-blur-sm ${
                      inWatchlist 
                        ? 'bg-green-600/80 text-white hover:bg-green-700/80' 
                        : 'bg-gray-700/80 text-white hover:bg-gray-600/80'
                    }`}
                  >
                    {inWatchlist ? <Check size={24} /> : <Plus size={24} />}
                    {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </button>
                </div>

                {/* Creator */}
                {creator && (
                  <div className="text-gray-300 mb-2">
                    <span className="font-medium">Created by:</span> {creator.name}
                  </div>
                )}

                {/* Show specific info */}
                <div className="text-gray-300">
                  <span className="font-medium">Seasons:</span> {displayShow.number_of_seasons || (displayShow.seasons?.length || 1)}
                  {(displayShow as any).number_of_episodes && (
                    <span className="ml-4">
                      <span className="font-medium">Episodes:</span> {(displayShow as any).number_of_episodes}
                    </span>
                  )}
                  {selectedSeason && (
                    <div className="mt-2">
                      <span className="font-medium">Current Season:</span> {selectedSeason.name || `Season ${selectedSeason.season_number}`}
                      <span className="ml-4">
                        <span className="font-medium">Episodes:</span> {selectedSeason.episode_count || 10}
                      </span>
                      {selectedSeason.air_date && (
                        <div className="mt-1">
                          <span className="font-medium">Aired:</span> {new Date(selectedSeason.air_date).getFullYear()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      {selectedSeason && episodes.length > 0 && (
        <div className="bg-black py-16">
          <div className="max-w-7xl mx-auto px-4 md:px-12">
            {/* Season Selector */}
            {displayShow.seasons && displayShow.seasons.length > 1 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Seasons</h3>
                <div className="flex flex-wrap gap-2">
                  {displayShow.seasons.filter(s => s.season_number > 0).map((season) => (
                    <button
                      key={season.season_number}
                      onClick={() => setSelectedSeason(season)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedSeason?.season_number === season.season_number
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Season {season.season_number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Season Details */}
            {selectedSeason && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  {selectedSeason.name || `Season ${selectedSeason.season_number}`}
                </h3>
                {selectedSeason.overview && (
                  <p className="text-gray-300 mb-4">{selectedSeason.overview}</p>
                )}
                {selectedSeason.air_date && (
                  <p className="text-gray-400 text-sm mb-4">
                    First aired: {new Date(selectedSeason.air_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Episodes List - Compact and Scrollable */}
            <h3 className="text-xl font-bold text-white mb-6">Episodes</h3>
            <div className="max-h-96 overflow-y-auto scrollbar-hide">
              <div className="space-y-4">
                {episodes.map((episode) => (
                  <div
                    key={episode.episode_number}
                    className="flex bg-gray-900/80 rounded-lg overflow-hidden hover:bg-gray-800/80 transition-colors cursor-pointer group"
                    onClick={() => handleEpisodeClick(episode)}
                  >
                    {/* Episode Thumbnail */}
                    <div className="w-32 h-20 bg-gray-800 flex items-center justify-center flex-shrink-0 relative">
                      {episode.still_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                          alt={episode.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <Play size={20} className="mx-auto mb-1" />
                          <p className="text-xs">EP {episode.episode_number}</p>
                        </div>
                      )}
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={24} className="text-white" />
                      </div>
                    </div>
                    
                    {/* Episode Details */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm">
                          {episode.episode_number}. {episode.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 ml-4">
                          <span>{episode.runtime || averageRuntime} min</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span>{episode.vote_average || displayShow.vote_average}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                        {episode.overview || `Episode ${episode.episode_number} of ${selectedSeason?.name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Shows Section */}
      {similarShows.length > 0 && (
        <div className="bg-black pb-16 pt-8">
          <MovieRow 
            title="More Like This" 
            movies={similarShows} 
            loading={loadingSimilar}
            onItemClick={(clickedShow) => {
              onClose(); // Close current modal
              // Trigger parent to open new show modal
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('openShowModal', { detail: clickedShow }));
                }
              }, 100);
            }}
          />
        </div>
      )}

      {/* Loading Similar Shows */}
      {loadingSimilar && similarShows.length === 0 && (
        <div className="bg-black pb-16 pt-8">
          <MovieRow title="More Like This" movies={[]} loading={true} />
        </div>
      )}
    </div>
  );
};

export default TVShowPlayer; 