import React, { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import AdBanner from './AdBanner';
import api, { TVShow, Season, Episode } from '@/services/api';
import { 
  ChevronLeft, ChevronRight, Play, Calendar, Clock, Star, ArrowLeft, Users, 
  DollarSign, Award, Building2, MapPin, Languages, Info, Film, Globe, Hash, Tags,
  ChevronDown, ChevronUp
} from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

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
  const [isOpen, setIsOpen] = useState(false);
  const [relatedShows, setRelatedShows] = useState<TVShow[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const { settings: adminSettings } = useAdminSettings();

  // Debug: Log the show data being passed
  console.log('TVShowPlayer received show data:', show);

  // Animation effect for opening
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

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

  // Fetch related shows
  useEffect(() => {
    const fetchRelatedShows = async () => {
      try {
        setLoadingRelated(true);
        // Use the recommendations from show details if available, otherwise fetch similar shows
        if (showDetails?.recommendations && showDetails.recommendations.length > 0) {
          // Convert recommendations to TVShow format
          const recommendationsAsShows = showDetails.recommendations.map(rec => ({
            ...rec,
            overview: '',
            backdrop_path: '',
            first_air_date: '',
            vote_count: 0,
            genres: [],
            name: rec.title
          })) as TVShow[];
          setRelatedShows(recommendationsAsShows.slice(0, 6));
        } else {
          // Fallback to popular shows in the same genre
          const genreId = show.genres?.[0]?.id;
          if (genreId) {
            const response = await api.getShowsByGenre(genreId);
            const similarShows = response.data.results
              .filter((s: TVShow) => s.id !== show.id)
              .slice(0, 6);
            setRelatedShows(similarShows);
          } else {
            // Final fallback to popular shows
            const response = await api.getPopularShows();
            const popularShows = response.data.results
              .filter((s: TVShow) => s.id !== show.id)
              .slice(0, 6);
            setRelatedShows(popularShows);
          }
        }
      } catch (error) {
        console.error('Error fetching related shows:', error);
        setRelatedShows([]);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedShows();
  }, [show.id, show.genres, showDetails?.recommendations]);

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

  // Helper functions for formatting
  const formatReleaseDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRuntime = (minutes: number) => {
    if (!minutes) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatMoney = (amount: number) => {
    if (!amount || amount === 0) return 'Unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get main cast (first 10 actors)
  const mainCast = showDetails?.cast?.slice(0, 10) || [];
  
  // Get director from crew
  const director = showDetails?.crew?.find(member => 
    member.job === 'Director' || member.department === 'Directing'
  );

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onClose(), 300);
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
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 overflow-hidden ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      >
        {/* Background with backdrop image */}
        <div className="absolute inset-0">
            <img
            src={`https://image.tmdb.org/t/p/original${show.backdrop_path || show.poster_path}`}
              alt={show.name}
              className="w-full h-full object-cover"
            />
          {/* Mobile-optimized gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/80 to-black/70 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/60 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
        </div>
      </div>

      {/* Modal Content - Centered */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 overflow-hidden ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back Button */}
        <div className="absolute top-0 left-0 right-0 z-20 h-16 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20 shadow-lg"
            aria-label="Close modal"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          </div>

        {/* Content */}
        <div className="h-full max-w-6xl w-full mx-2 sm:mx-4 flex items-center justify-center">
          <div className="max-h-[90vh] w-full overflow-y-auto scrollbar-hide">
          {/* Content */}
          <div className="p-3 sm:p-4 md:p-6 pt-20 sm:pt-24 relative z-10">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
              {/* Poster Image */}
              <div className="flex-shrink-0 flex justify-center lg:justify-start">
                <img
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name}
                  className="w-48 sm:w-56 md:w-64 h-72 sm:h-80 md:h-96 object-cover rounded-lg shadow-2xl"
                />
              </div>

              {/* Main Info */}
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-white text-center lg:text-left">
                  {show.name}
                </h2>

                {showDetails?.tagline && (
                  <p className="text-gray-300 italic mb-4 text-sm md:text-base text-center lg:text-left">"{showDetails.tagline}"</p>
                )}

                {/* Primary Metadata */}
                <div className="flex flex-wrap gap-2 mb-4 justify-center lg:justify-start">
                  {show.vote_average > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-600/80 text-white text-xs sm:text-sm">
                      <Star className="w-3 h-3 text-yellow-400" />
                      {show.vote_average.toFixed(1)}
                      {show.vote_count > 0 && (
                        <span className="text-xs hidden sm:inline">({show.vote_count.toLocaleString()} votes)</span>
                      )}
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1 bg-gray-800/80 text-white border-gray-600 text-xs sm:text-sm">
                    <Calendar className="w-3 h-3" />
                    <span className="hidden sm:inline">{formatReleaseDate(show.first_air_date)}</span>
                    <span className="sm:hidden">{new Date(show.first_air_date).getFullYear()}</span>
                  </Badge>
                  {showDetails?.number_of_seasons && (
                    <Badge variant="outline" className="bg-gray-800/80 text-white border-gray-600 text-xs sm:text-sm">
                      {showDetails.number_of_seasons} Season{showDetails.number_of_seasons > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {show.genres?.slice(0, 3).map((genre: any) => (
                    <Badge key={genre.id} variant="secondary" className="bg-gray-800/80 text-white text-xs sm:text-sm">
                      {genre.name}
                    </Badge>
                  ))}
                </div>

                {/* Overview */}
                <p className="text-gray-200 mb-6 text-sm md:text-base leading-relaxed text-center lg:text-left">{show.overview}</p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center lg:justify-start">
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Play S1E1 clicked');
                      handlePlayEpisode(1);
                    }}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md text-base font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform w-full sm:w-auto"
                  >
                    <Play className="w-4 h-4" />
                    Play S1E1
                  </Button>
                </div>

                {/* Detailed Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  {director && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Film className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Creator: {director.name}</span>
                    </div>
                  )}
                  {showDetails?.status && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Status: {showDetails.status}</span>
                    </div>
                  )}
                  {showDetails?.original_language && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Original Language: {showDetails.original_language.toUpperCase()}</span>
                    </div>
                  )}
                  {showDetails?.budget > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Budget: {formatMoney(showDetails.budget)}</span>
                    </div>
                  )}
                  {showDetails?.revenue > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Award className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Revenue: {formatMoney(showDetails.revenue)}</span>
                    </div>
                  )}
                  {showDetails?.production_companies?.[0] && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Studio: {showDetails.production_companies[0].name}</span>
                    </div>
                  )}
                  {showDetails?.production_countries?.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        Countries: {showDetails.production_countries?.slice(0, 2).map(c => c.name).join(', ')}
                        {showDetails.production_countries.length > 2 && '...'}
                      </span>
                    </div>
                  )}
                  {showDetails?.spoken_languages?.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Languages className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        Languages: {showDetails.spoken_languages?.slice(0, 2).map(l => l.name).join(', ')}
                        {showDetails.spoken_languages.length > 2 && '...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Cast Section */}
                {mainCast.length > 0 && (
                  <>
                    <Separator className="my-6 bg-gray-700" />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white justify-center lg:justify-start">
                        <Users className="w-5 h-5" />
                        Cast
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {mainCast.map(actor => (
                          <div key={actor.id} className="flex items-center gap-3">
                            {actor.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                alt={actor.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-white truncate">{actor.name}</p>
                              <p className="text-xs text-gray-400 truncate">{actor.character}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Keywords */}
                {showDetails?.keywords?.length > 0 && (
                  <>
                    <Separator className="my-6 bg-gray-700" />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white justify-center lg:justify-start">
                        <Tags className="w-5 h-5" />
                        Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                        {showDetails.keywords.slice(0, 8).map(keyword => (
                          <Badge key={keyword.id} variant="outline" className="text-xs bg-gray-800/80 text-white border-gray-600">
                            {keyword.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ad Banner (same as MovieModal, backend-driven) */}
            {adminSettings?.ads?.playerPageAd?.enabled && (
              <div className="mt-8">
                <AdBanner
                  adKey="playerPageAd"
                  imageUrl={adminSettings.ads.playerPageAd.imageUrl}
                  clickUrl={adminSettings.ads.playerPageAd.clickUrl}
                  enabled={adminSettings.ads.playerPageAd.enabled}
                />
              </div>
            )}

            {/* Related Shows Section */}
            {relatedShows.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white justify-center lg:justify-start">
                  <Film className="w-5 h-5" />
                  Related Shows
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {relatedShows.map((relatedShow) => (
                    <div
                      key={relatedShow.id}
                      className="cursor-pointer group"
                      onClick={() => {
                        // Update the show data
                        const updatedShow = { ...relatedShow, media_type: 'tv' };
                        // Close current modal and open new one
                        onClose();
                        setTimeout(() => {
                          // This would need to be handled by the parent component
                          // For now, we'll just log the action
                          console.log('Opening related show:', updatedShow);
                        }, 300);
                      }}
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                        <img
                          src={`https://image.tmdb.org/t/p/w500${relatedShow.poster_path}`}
                          alt={relatedShow.name}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-black/60 rounded-full p-2 sm:p-3 flex items-center justify-center">
                            <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                        {/* Rating Badge */}
                        {relatedShow.vote_average > 0 && (
                          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black/80 text-yellow-400 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-semibold flex items-center gap-1">
                            <Star className="w-2 h-2 sm:w-3 sm:h-3" />
                            {relatedShow.vote_average.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <h4 className="text-white font-medium text-xs sm:text-sm line-clamp-2">
                              {relatedShow.name}
                        </h4>
                        <p className="text-gray-400 text-xs mt-1">
                              {formatReleaseDate(relatedShow.first_air_date)}
                            </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Season Selector */}
            <Separator className="my-6 bg-gray-700" />
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-white text-center lg:text-left">Select Season</h3>
              <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
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
                    className={`min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm ${
                      selectedSeason === season.season_number 
                        ? 'bg-white text-black hover:bg-gray-200' 
                        : 'bg-gray-800/80 text-white border-gray-600 hover:bg-gray-700/80'
                    }`}
                  >
                    Season {season.season_number}
                  </Button>
                ))}
              </div>
            </div>

            {/* Episodes List */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white justify-center lg:justify-start">
                Season {selectedSeason} Episodes
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
              </h3>
                  
                  <div className="space-y-3 pb-4">
                    {loading ? (
                      // Loading skeleton
                      Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg animate-pulse">
                      <div className="w-24 sm:w-32 h-16 sm:h-20 bg-gray-700 rounded flex-shrink-0" />
                          <div className="flex-1">
                        <div className="h-3 sm:h-4 bg-gray-700 rounded w-1/4 mb-2" />
                        <div className="h-2 sm:h-3 bg-gray-700 rounded w-3/4 mb-2" />
                        <div className="h-2 sm:h-3 bg-gray-700 rounded w-1/2" />
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
                      className="w-full text-left flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-white/50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(`Episode ${episode.episode_number} clicked`);
                            handlePlayEpisode(episode.episode_number);
                          }}
                        >
                          {/* Episode Thumbnail */}
                      <div className="relative w-24 sm:w-32 h-16 sm:h-20 bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                            {episode.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                                alt={episode.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white" />
                            </div>
                          </div>

                          {/* Episode Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 text-xs sm:text-sm">E{episode.episode_number}</span>
                          <h4 className="font-medium truncate text-white text-sm sm:text-base">{episode.name}</h4>
                            </div>
                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 mb-2">
                              {episode.overview || 'No description available.'}
                            </p>
                            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
                              {episode.air_date && (
                            <span className="text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span className="hidden sm:inline">{new Date(episode.air_date).toLocaleDateString()}</span>
                                  <span className="sm:hidden">{new Date(episode.air_date).getFullYear()}</span>
                                </span>
                              )}
                              {episode.vote_average > 0 && (
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <Star className="w-3 h-3" />
                                  {episode.vote_average.toFixed(1)}
                                </span>
                              )}
                          <span className="text-white flex items-center gap-1 group-hover:text-gray-300">
                                <Play className="w-3 h-3" />
                                <span className="hidden sm:inline">Play Episode</span>
                                <span className="sm:hidden">Play</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hide scrollbar styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </>
  );
};

export default TVShowPlayer; 