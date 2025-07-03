import React, { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import api, { TVShow, Season, Episode } from '@/services/api';
import { ChevronLeft, ChevronRight, Play, Calendar, Clock, Star, X } from 'lucide-react';

interface TVShowPlayerProps {
  show: TVShow;
  onClose: () => void;
}

const TVShowPlayer: React.FC<TVShowPlayerProps> = ({ show, onClose }) => {
  const [showDetails, setShowDetails] = useState<TVShow | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonDetails, setSeasonDetails] = useState<{ episodes: Episode[] } | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log the show data being passed
  console.log('TVShowPlayer received show data:', show);

  // Fetch show details with seasons
  useEffect(() => {
    const fetchShowDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getShowDetails(show.id);
        setShowDetails(response.data);
      } catch (error) {
        console.error('Error fetching show details:', error);
        setError('Failed to load show details');
        // Use the provided show data as fallback
        setShowDetails(show);
      } finally {
        setLoading(false);
      }
    };

    fetchShowDetails();
  }, [show.id]);

  // Fetch season details when season changes
  useEffect(() => {
    const fetchSeasonDetails = async () => {
      try {
        const response = await api.getShowSeason(show.id, selectedSeason);
        setSeasonDetails(response.data);
        setSelectedEpisode(1); // Reset to first episode
      } catch (error) {
        console.error('Error fetching season details:', error);
        // Fallback with mock episodes
        setSeasonDetails({
          episodes: [
            { episode_number: 1, name: 'Episode 1', overview: 'First episode', still_path: '', air_date: '', vote_average: 0 },
            { episode_number: 2, name: 'Episode 2', overview: 'Second episode', still_path: '', air_date: '', vote_average: 0 },
            { episode_number: 3, name: 'Episode 3', overview: 'Third episode', still_path: '', air_date: '', vote_average: 0 }
          ]
        });
      }
    };

    if (selectedSeason) {
      fetchSeasonDetails();
    }
  }, [show.id, selectedSeason]);

  const handlePlayEpisode = (episodeNumber: number) => {
    setSelectedEpisode(episodeNumber);
    setIsPlaying(true);
  };

  const getSeasonOptions = () => {
    if (showDetails?.seasons) {
      return showDetails.seasons.filter(season => season.season_number > 0);
    }
    // Fallback to number_of_seasons if seasons array not available
    if (showDetails?.number_of_seasons) {
      return Array.from({ length: showDetails.number_of_seasons }, (_, i) => ({
        season_number: i + 1,
        name: `Season ${i + 1}`,
        episode_count: 10,
        overview: '',
        poster_path: ''
      }));
    }
    return [{ season_number: 1, name: 'Season 1', episode_count: 10, overview: '', poster_path: '' }];
  };

  if (isPlaying) {
    return (
      <VideoPlayer
        tmdbId={show.id}
        type="tv"
        season={selectedSeason}
        episode={selectedEpisode}
        title={`${show.name} - S${selectedSeason}E${selectedEpisode}`}
        onClose={() => setIsPlaying(false)}
      />
    );
  }

  const seasons = getSeasonOptions();
  const episodes = seasonDetails?.episodes || [];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative">
          <div 
            className="h-64 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(https://image.tmdb.org/t/p/original${show.backdrop_path})`
            }}
          >
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="absolute bottom-4 left-4 text-white">
              <h1 className="text-3xl font-bold mb-2">{show.name}</h1>
              <div className="flex items-center gap-4 text-sm mb-4">
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                  <Star className="w-3 h-3 mr-1" />
                  {show.vote_average.toFixed(1)}
                </Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(show.first_air_date).getFullYear()}
                </span>
                {showDetails?.number_of_seasons && (
                  <span>{showDetails.number_of_seasons} Season{showDetails.number_of_seasons > 1 ? 's' : ''}</span>
                )}
              </div>
              
              {/* Quick Play Button */}
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Play S1E1 clicked');
                  handlePlayEpisode(1);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                <Play className="w-4 h-4 mr-2" />
                Play S1E1
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Overview */}
          <p className="text-gray-300 mb-6 leading-relaxed">{show.overview}</p>

          {/* Season Selector */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-white">Select Season</h3>
            <div className="flex gap-2 flex-wrap">
              {seasons.map((season) => (
                <Button
                  key={season.season_number}
                  variant={selectedSeason === season.season_number ? "default" : "outline"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Season ${season.season_number} clicked`);
                    setSelectedSeason(season.season_number);
                  }}
                  className="min-w-[100px]"
                >
                  Season {season.season_number}
                </Button>
              ))}
            </div>
          </div>

          {/* Episodes List */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-white flex items-center gap-2">
              Season {selectedSeason} Episodes
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
              )}
            </h3>
            
            <ScrollArea className="h-[400px] w-full pr-4">
              <div className="space-y-3 pb-4">
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg animate-pulse">
                      <div className="w-32 h-20 bg-gray-700 rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                        <div className="h-3 bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : episodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No episodes available for this season.</p>
                  </div>
                ) : (
                  episodes.map((episode) => (
                    <button
                      key={episode.episode_number}
                      className="w-full text-left flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`Episode ${episode.episode_number} clicked`);
                        handlePlayEpisode(episode.episode_number);
                      }}
                    >
                      {/* Episode Thumbnail */}
                      <div className="relative w-32 h-20 bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                        {episode.still_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={episode.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 text-sm">E{episode.episode_number}</span>
                          <h4 className="text-white font-medium truncate">{episode.name}</h4>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                          {episode.overview || 'No description available.'}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          {episode.air_date && (
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(episode.air_date).toLocaleDateString()}
                            </span>
                          )}
                          {episode.vote_average > 0 && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-3 h-3" />
                              {episode.vote_average.toFixed(1)}
                            </span>
                          )}
                          <span className="text-red-400 flex items-center gap-1 group-hover:text-red-300">
                            <Play className="w-3 h-3" />
                            Play Episode
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVShowPlayer; 