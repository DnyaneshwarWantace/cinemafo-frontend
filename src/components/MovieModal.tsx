import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, Star, Calendar, Clock, Loader2, Film, Users, Globe, Info, DollarSign, 
  Award, Building2, MapPin, Languages, Tags, ArrowLeft, ChevronLeft, ChevronRight, Bookmark
} from "lucide-react";
import TVShowPlayer from "./TVShowPlayer";
import AdBanner from "./AdBanner";
import MovieCarousel from "./MovieCarousel";
import api, { Movie, TVShow, cacheUtils } from "@/services/api";
import useAdminSettings from '@/hooks/useAdminSettings';
import { useWatchHistory } from '@/hooks/useWatchHistory';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
  onProgressUpdate?: (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie: initialMovie, onClose, onProgressUpdate }) => {
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loading, setLoading] = useState(false);
  const [showTVShowPlayer, setShowTVShowPlayer] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [castPage, setCastPage] = useState(0);
  const [watchlistUpdate, setWatchlistUpdate] = useState(0);
  const { settings: adminSettings } = useAdminSettings();
  const { getHistoryItem } = useWatchHistory();
  
  // Check if there's continue watching progress for this movie
  const continueWatchingItem = getHistoryItem(movie.id, 'movie');

  // Watchlist functions
  const isInWatchlist = (item: Movie): boolean => {
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      return watchlist.some((watchlistItem: any) => 
        watchlistItem.id === item.id && (watchlistItem.media_type || 'movie') === (item.media_type || 'movie')
      );
    } catch {
      return false;
    }
  };

  const toggleWatchlist = (e: React.MouseEvent, item: Movie) => {
    e.stopPropagation();
    try {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInList = isInWatchlist(item);
      
      if (isInList) {
        const updatedWatchlist = watchlist.filter((watchlistItem: any) => 
          !(watchlistItem.id === item.id && (watchlistItem.media_type || 'movie') === (item.media_type || 'movie'))
        );
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      } else {
        const itemWithType = { ...item, media_type: item.media_type || 'movie' };
        watchlist.push(itemWithType);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
      }
      
      setWatchlistUpdate(prev => prev + 1);
      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };

  // No need to check for detailed data anymore - backend provides complete data
  console.log(`✅ Movie ${initialMovie.id} loaded with complete data from backend`);
  
  // Animation effect for opening
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Hide any tooltips when modal opens
  useEffect(() => {
    // Dispatch a custom event to hide tooltips
    const hideTooltipsEvent = new CustomEvent('hideTooltips');
    document.dispatchEvent(hideTooltipsEvent);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
        } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);





  const handleWatchNow = () => {
    const releaseDate = movie.release_date || movie.first_air_date;
    
    if (!releaseDate) {
      console.warn('No release date available for this content');
      return;
    }

    const releaseDateObj = new Date(releaseDate);
    const now = new Date();
    
    if (releaseDateObj > now) {
      console.log('Content is not yet released:', releaseDate);
      return;
    }

    const isTVShow = movie.media_type === 'tv' || (movie.name && !movie.title);
    
    if (isTVShow) {
      onClose();
      setShowTVShowPlayer(true);
    } else {
      // Check for existing watch history to resume from where left off
      const historyItem = getHistoryItem(movie.id, 'movie');
      
      // Navigate to video player page for movies
      const params = new URLSearchParams({
        id: movie.id.toString(),
        type: 'movie',
        title: movie.title || movie.name || 'Movie'
      });
      
      // Add time parameter if there's existing watch history
      if (historyItem && historyItem.currentTime > 10 && historyItem.progress < 90) {
        params.append('time', historyItem.currentTime.toString());
        console.log('🎬 Resuming movie from watch history:', {
          id: movie.id,
          currentTime: historyItem.currentTime,
          progress: historyItem.progress
        });
      }
      
      navigate(`/watch?${params.toString()}`);
    }
  };

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onClose(), 300);
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRuntime = (minutes: number) => {
    if (!minutes || minutes === 0) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Memoized computed values
  const director = useMemo(() => {
    if (!movie.crew) return null;
    return movie.crew.find(member => member.job === 'Director');
  }, [movie.crew]);

  const mainCast = useMemo(() => {
    if (!movie.cast) return [];
    return movie.cast; // Show all cast members
  }, [movie.cast]);

  const CAST_PER_PAGE = 12;
  const totalCastPages = Math.ceil(mainCast.length / CAST_PER_PAGE);
  const currentCastPage = mainCast.slice(castPage * CAST_PER_PAGE, (castPage + 1) * CAST_PER_PAGE);

  const nextCastPage = () => {
    if (castPage < totalCastPages - 1) {
      setCastPage(castPage + 1);
    }
  };

  const prevCastPage = () => {
    if (castPage > 0) {
      setCastPage(castPage - 1);
    }
  };

  const isUpcoming = useMemo(() => {
    const releaseDate = new Date(movie.release_date || movie.first_air_date);
    return releaseDate > new Date();
  }, [movie.release_date, movie.first_air_date]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] transition-opacity duration-300 overflow-hidden ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      >
        {/* Background with backdrop image */}
        <div className="absolute inset-0">
              <img
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path}`}
              alt={movie.title || movie.name}
              className="w-full h-full object-cover"
              />
          {/* Mobile-optimized gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/40 sm:bg-gradient-to-r sm:from-black/60 sm:via-black/30 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
      </div>

      {/* Modal Content - Centered */}
      <div 
        className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-300 overflow-hidden ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Back Button */}
        <div className="absolute top-0 left-0 right-0 z-20 h-20 bg-gradient-to-b from-black/50 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-blue-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <img src="/logo.svg" alt="CINEMA.BZ" className="h-6 sm:h-8 md:h-10 lg:h-12 w-auto drop-shadow transition-all duration-300 filter brightness-110" />
          </div>
            </div>

            {/* Content */}
        <div className="h-full max-w-6xl w-full mx-2 sm:mx-4 flex items-start justify-center">
          <div className="max-h-[90vh] w-full overflow-y-auto scrollbar-hide pt-40" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Content */}
          <div className="p-3 sm:p-4 md:p-6 pt-24 sm:pt-28 relative z-10">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
              {/* Poster Image */}
              <div className="flex-shrink-0 flex justify-center lg:justify-start">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title || movie.name}
                  className="w-48 sm:w-56 md:w-64 h-72 sm:h-80 md:h-96 object-cover rounded-lg shadow-2xl"
                  />
                </div>

                {/* Main Info */}
                <div className="flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-white text-center lg:text-left">
                    {movie.title || movie.name}
                  </h2>

                  {movie.tagline && (
                  <p className="text-gray-300 italic mb-4 text-sm md:text-base text-center lg:text-left">"{movie.tagline}"</p>
                  )}

                  {/* Primary Metadata */}
                <div className="flex flex-wrap gap-2 mb-4 justify-center lg:justify-start">
                    {movie.vote_average > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-600/80 text-white text-xs sm:text-sm">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {movie.vote_average.toFixed(1)}
                        {movie.vote_count > 0 && (
                        <span className="text-xs hidden sm:inline">({movie.vote_count.toLocaleString()} votes)</span>
                        )}
                      </Badge>
                    )}
                  <Badge variant="outline" className="flex items-center gap-1 bg-blue-600/20 text-white border-blue-500 text-xs sm:text-sm">
                      <Calendar className="w-3 h-3" />
                    <span className="hidden sm:inline">{formatReleaseDate(movie.release_date || movie.first_air_date)}</span>
                    <span className="sm:hidden">{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
                    </Badge>
                {movie.runtime && (
                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-600/20 text-white border-blue-500 text-xs sm:text-sm">
                        <Clock className="w-3 h-3" />
                        {formatRuntime(movie.runtime)}
                      </Badge>
                    )}
                  {movie.genres?.slice(0, 3).map((genre: any) => (
                    <Badge key={genre.id} variant="outline" className="bg-blue-600/20 text-white border-blue-500 text-xs sm:text-sm hover:bg-blue-600/20 hover:text-white">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Overview */}
                <p className="text-gray-200 mb-6 text-sm md:text-base leading-relaxed text-center lg:text-left">{movie.overview}</p>

                  {/* Action Buttons and Show More Details */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center lg:justify-start">
                    {isUpcoming ? (
                    <Button disabled className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-md text-base font-semibold cursor-not-allowed opacity-75 w-full sm:w-auto">
                        <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">Coming {formatReleaseDate(movie.release_date || movie.first_air_date)}</span>
                      <span className="sm:hidden">Coming Soon</span>
                      </Button>
                    ) : (
                      <>
                        {/* Continue Watching Button - Show if there's progress */}
                        {continueWatchingItem && (
                          <Button 
                            onClick={handleWatchNow} 
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md text-base font-semibold hover:bg-blue-700 transition-all duration-200 hover:scale-105 transform w-full sm:w-auto"
                          >
                            <Play className="w-4 h-4" />
                            Continue Watching ({Math.floor(continueWatchingItem.currentTime / 60)}:{(continueWatchingItem.currentTime % 60).toFixed(0).padStart(2, '0')})
                          </Button>
                        )}
                        
                        {/* Watch Now Button */}
                        <Button onClick={handleWatchNow} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md text-base font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 transform w-full sm:w-auto">
                            <Film className="w-4 h-4" />
                            {continueWatchingItem ? 'Start Over' : 'Watch Now'}
                          </Button>
                      </>
                )}
                
                <Button
                  onClick={(e) => toggleWatchlist(e, movie)}
                  variant="outline"
                  className={`flex items-center gap-2 bg-blue-600/20 text-white border-blue-500 hover:bg-blue-600/30 w-full sm:w-auto ${
                    isInWatchlist(movie) ? 'fill-white' : ''
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isInWatchlist(movie) ? 'fill-white' : ''}`} />
                  {isInWatchlist(movie) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                </Button>
                
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  className="flex items-center gap-2 bg-blue-600/20 text-white border-blue-500 hover:bg-blue-600/30 w-full sm:w-auto"
                >
                  {showDetails ? (
                    <>
                      <ChevronLeft className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      Show More Details
                    </>
                  )}
                </Button>
              </div>

              {/* Ad Banner - Moved below Watch Now button */}
              {adminSettings?.ads?.playerPageAd?.enabled && (
                <div className="mt-6">
                  <AdBanner
                    adKey="playerPageAd"
                    imageUrl={adminSettings.ads.playerPageAd.imageUrl}
                    cloudinaryUrl={adminSettings.ads.playerPageAd.cloudinaryUrl}
                    clickUrl={adminSettings.ads.playerPageAd.clickUrl}
                    enabled={adminSettings.ads.playerPageAd.enabled}
                    className="mx-auto lg:!mx-0"
                  />
                </div>
              )}

              {/* Separator Line - Shows after ad when details are expanded */}
              {showDetails && (
                <Separator className="my-6 bg-blue-500/50" />
              )}
              
                  {/* Detailed Information Grid - Hidden by default */}
                {showDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-6">
                    {director && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Film className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Director: {director.name}</span>
                      </div>
                    )}
                    {movie.status && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                          {movie.status === 'Released' 
                            ? `Released on ${formatReleaseDate(movie.release_date)}` 
                            : movie.status}
                        </span>
                      </div>
                    )}
                    {movie.original_language && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Original Language: {movie.original_language.toUpperCase()}</span>
                      </div>
                    )}
                    {movie.budget > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Budget: {formatMoney(movie.budget)}</span>
                      </div>
                    )}
                    {movie.revenue > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Award className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Revenue: {formatMoney(movie.revenue)}</span>
                      </div>
                    )}
                    {movie.production_companies?.[0] && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Studio: {movie.production_companies[0].name}</span>
                      </div>
                    )}
                    {movie.production_countries?.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        Countries: {movie.production_countries?.slice(0, 2).map(c => c.name).join(', ')}
                        {movie.production_countries.length > 2 && '...'}
                        </span>
                      </div>
                    )}
                    {movie.spoken_languages?.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Languages className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        Languages: {movie.spoken_languages?.slice(0, 2).map(l => l.name).join(', ')}
                        {movie.spoken_languages.length > 2 && '...'}
                        </span>
            </div>
                    )}
          </div>
                )}

                  {/* Expanded Details Section */}
                  {showDetails && (
                    <>
                  {/* Cast Section */}
                  {mainCast.length > 0 && (
                    <>
                    <Separator className="my-6 bg-blue-500/50" />
                      <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white justify-center lg:justify-start">
                          <Users className="w-5 h-5" />
                          Cast ({mainCast.length})
                        </h3>
                      
                      {/* Cast Carousel */}
                      <div className="relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                          {currentCastPage.map(actor => (
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
                        
                        {/* Cast Navigation Arrows */}
                        {totalCastPages > 1 && (
                          <div className="flex justify-center items-center gap-4 mt-4">
                            <button
                              onClick={prevCastPage}
                              disabled={castPage === 0}
                              className={`p-2 rounded-full transition-all duration-200 ${
                                castPage === 0 
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            
                            <span className="text-sm text-gray-300">
                              {castPage + 1} / {totalCastPages}
                            </span>
                            
                            <button
                              onClick={nextCastPage}
                              disabled={castPage === totalCastPages - 1}
                              className={`p-2 rounded-full transition-all duration-200 ${
                                castPage === totalCastPages - 1 
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      </div>
                    </>
                  )}
                    </>
                  )}
              </div>
            </div>


          </div>
        </div>
      </div>
          </div>



      {/* TV Show Player */}
      {showTVShowPlayer && movie.media_type === 'tv' && (
        <TVShowPlayer
          show={{
            ...movie,
            name: movie.name || movie.title,
            first_air_date: movie.first_air_date || movie.release_date
          } as TVShow}
          onClose={() => setShowTVShowPlayer(false)}
        />
      )}

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

export default MovieModal;