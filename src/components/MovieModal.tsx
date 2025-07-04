import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, Star, Calendar, Clock, Loader2, AlertCircle, Film, Download, Volume2, VolumeX, Users, Globe, Info, DollarSign, 
  Award, Building2, MapPin, Languages, Tags, ThumbsUp, Hash
} from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import TVShowPlayer from "./TVShowPlayer";
import api, { Movie, TVShow, cacheUtils } from "@/services/api";

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie: initialMovie, onClose }) => {
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [loading, setLoading] = useState(false);
  const [trailerData, setTrailerData] = useState<any>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<any>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);
  const [useYouTubeFallback, setUseYouTubeFallback] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showFullMovie, setShowFullMovie] = useState(false);
  const [showTVShowPlayer, setShowTVShowPlayer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // No need to check for detailed data anymore - backend provides complete data
  console.log(`✅ Movie ${initialMovie.id} loaded with complete data from backend`);
  
  // Log cache stats in development
  if (process.env.NODE_ENV === 'development') {
    const stats = cacheUtils.getStats();
    console.log(`📊 Cache stats: ${stats.size} items cached`);
  }

  // Function to fetch trailer from our backend
  const fetchTrailer = async () => {
    setIsLoadingTrailer(true);
    setTrailerError(null);
    setVideoError(false);
    setUseYouTubeFallback(false);
    
    try {
      const movieId = movie.id;
      console.log('Fetching trailer for movie:', movieId, movie.title || movie.name);
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/trailer/${movieId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Trailer not found' }));
        throw new Error(errorData.details || errorData.error || 'Trailer not found');
      }
      
      const data = await response.json();
      console.log('Trailer data received:', data);
      setTrailerData(data);
      setCurrentQuality(data.currentQuality);
      
      // Auto-play trailer
      setShowTrailer(true);
      
    } catch (error) {
      console.error('Error fetching trailer:', error);
      
      let errorMessage = 'Sorry, trailer not available for this movie.';
      if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to trailer service. Please check if the backend is running.';
      } else if (error.message !== 'Trailer not found') {
        errorMessage = error.message;
      }
      
      setTrailerError(errorMessage);
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  // Auto-fetch trailer when modal opens
  useEffect(() => {
    fetchTrailer();
  }, [movie.id]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const video = document.querySelector('#trailer-video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
    }
  };

  const handleWatchTrailer = async () => {
    await fetchTrailer();
  };

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
      setShowFullMovie(true);
    }
  };

  const changeQuality = async (quality: any) => {
    if (!trailerData || !quality.formatId) return;
    
    setIsLoadingQuality(true);
    setShowQualityMenu(false);
    setVideoError(false);
    
    try {
      console.log(`Changing quality to ${quality.quality}`);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/trailer/${movie.id}/quality/${quality.formatId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get quality URL');
      }
      
      const data = await response.json();
      
      // Update the trailer URL with the new quality
      setTrailerData(prev => ({
        ...prev,
        trailerUrl: data.trailerUrl
      }));
      setCurrentQuality(quality);
      
      // Force video reload by updating the video element
      const video = document.querySelector('#trailer-video') as HTMLVideoElement;
      if (video) {
        video.load();
      }
      
    } catch (error) {
      console.error('Error changing quality:', error);
      setTrailerError('Failed to change video quality');
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const downloadTrailer = async (quality?: any) => {
    if (!trailerData) return;
    
    try {
      const formatId = quality?.formatId || '';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/trailer/${movie.id}/download/${formatId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }
      
      const data = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename || `${movie.title || movie.name} - Trailer.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download started:', data.filename);
      
    } catch (error) {
      console.error('Error downloading trailer:', error);
      setTrailerError('Failed to download trailer');
    }
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setShowQualityMenu(false);
    setUseYouTubeFallback(false);
    setVideoError(false);
    // Reset trailer data after closing
    setTimeout(() => {
      setTrailerData(null);
      setTrailerError(null);
      setCurrentQuality(null);
      setIsLoadingQuality(false);
    }, 300);
  };

  // Handle video playback error - fallback to YouTube embed
  const handleVideoError = (e: any) => {
    console.error('Video playback error:', e);
    setVideoError(true);
    
    // If we have a YouTube URL, try to use YouTube embed as fallback
    if (trailerData?.youtubeUrl && !useYouTubeFallback) {
      console.log('Falling back to YouTube embed due to video error');
      setUseYouTubeFallback(true);
    } else {
      setTrailerError('Error playing trailer. The video format may not be supported by your browser.');
    }
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Handle ESC key press to close trailer and click outside to close quality menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showQualityMenu) {
          setShowQualityMenu(false);
        } else if (showTrailer) {
          closeTrailer();
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (showQualityMenu) {
        const target = event.target as Element;
        if (!target.closest('.quality-selector')) {
          setShowQualityMenu(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showTrailer, showQualityMenu, onClose]);



  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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
    return movie.cast.slice(0, 6);
  }, [movie.cast]);

  const isUpcoming = useMemo(() => {
    const releaseDate = new Date(movie.release_date || movie.first_air_date);
    return releaseDate > new Date();
  }, [movie.release_date, movie.first_air_date]);

  if (loading) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={!!movie && !showTrailer && !showFullMovie && !showTVShowPlayer} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          <ScrollArea className="h-full">
            {/* Backdrop Image */}
            <div className="relative w-full h-[40vh]">
              <img
                src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title || movie.name}
              className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
            </div>

            {/* Content */}
            <div className="p-6 -mt-10 relative z-10">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Poster */}
                <div className="w-[200px] flex-shrink-0">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title || movie.name}
                    className="w-full rounded-lg shadow-xl"
                  />
                </div>

                {/* Main Info */}
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    {movie.title || movie.name}
                  </h2>

                  {movie.tagline && (
                    <p className="text-muted-foreground italic mb-4">{movie.tagline}</p>
                  )}

                  {/* Primary Metadata */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.vote_average > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {movie.vote_average.toFixed(1)}
                        {movie.vote_count > 0 && (
                          <span className="text-xs">({movie.vote_count.toLocaleString()} votes)</span>
                        )}
                      </Badge>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatReleaseDate(movie.release_date || movie.first_air_date)}
                    </Badge>
                {movie.runtime && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRuntime(movie.runtime)}
                      </Badge>
                    )}
                    {movie.genres?.map((genre: any) => (
                      <Badge key={genre.id} variant="secondary">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Overview */}
                  <p className="text-muted-foreground mb-6">{movie.overview}</p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    {isUpcoming ? (
                      <Button disabled className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Coming {formatReleaseDate(movie.release_date || movie.first_air_date)}
                      </Button>
                    ) : (
                      <Button onClick={handleWatchNow} className="flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        Watch Now
                      </Button>
                )}
              </div>
              
                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {director && (
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        <span className="text-sm">Director: {director.name}</span>
                      </div>
                    )}
                    {movie.status && (
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span className="text-sm">
                          {movie.status === 'Released' 
                            ? `Released on ${formatReleaseDate(movie.release_date)}` 
                            : movie.status}
                        </span>
                      </div>
                    )}
                    {movie.original_language && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">Original Language: {movie.original_language.toUpperCase()}</span>
                      </div>
                    )}
                    {movie.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Budget: {formatMoney(movie.budget)}</span>
                      </div>
                    )}
                    {movie.revenue > 0 && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">Revenue: {formatMoney(movie.revenue)}</span>
                      </div>
                    )}
                    {movie.production_companies?.[0] && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">Studio: {movie.production_companies[0].name}</span>
                      </div>
                    )}
                    {movie.production_countries?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">
                          Countries: {movie.production_countries.map(c => c.name).join(', ')}
                        </span>
                      </div>
                    )}
                    {movie.spoken_languages?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        <span className="text-sm">
                          Languages: {movie.spoken_languages.map(l => l.name).join(', ')}
                        </span>
            </div>
                    )}
          </div>

                  {/* Cast Section */}
                  {mainCast.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Cast
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {mainCast.map(actor => (
                            <div key={actor.id} className="flex items-center gap-3">
                              {actor.profile_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                                  alt={actor.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{actor.name}</p>
                                <p className="text-xs text-muted-foreground">{actor.character}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Keywords */}
                  {movie.keywords?.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Tags className="w-5 h-5" />
                          Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {movie.keywords.map(keyword => (
                            <Badge key={keyword.id} variant="outline" className="text-xs">
                              {keyword.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Trailer Modal - Full Screen Netflix-style Player */}
      {showTrailer && trailerData && (
        <div className="fixed inset-0 z-[100] netflix-player flex items-center justify-center overflow-hidden trailer-modal" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Close Button */}
          <button
            onClick={closeTrailer}
            className="absolute top-6 right-6 z-[110] bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-200 shadow-2xl backdrop-blur-sm"
            aria-label="Close trailer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Switch to YouTube Button - only show if we have YouTube URL and there's an error */}
          {trailerData?.youtubeUrl && videoError && (
            <button
              onClick={() => setUseYouTubeFallback(!useYouTubeFallback)}
              className="absolute top-6 right-16 z-[110] bg-red-600/70 hover:bg-red-600/90 text-white p-3 rounded-lg transition-all duration-200 shadow-2xl backdrop-blur-sm"
              title={useYouTubeFallback ? "Try Direct Video" : "Open in YouTube"}
            >
              {useYouTubeFallback ? (
                <Film className="w-5 h-5" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              )}
            </button>
          )}
          
          {/* Quality & Download Controls - hide when using YouTube fallback */}
          {!useYouTubeFallback && trailerData?.availableQualities && trailerData.availableQualities.length > 0 && (
            <div className="absolute top-6 right-20 z-[110] quality-selector flex gap-2">
              {/* Download Button */}
              <button
                onClick={() => downloadTrailer(currentQuality)}
                className="bg-green-600/70 hover:bg-green-600/90 text-white p-3 rounded-lg transition-all duration-200 shadow-2xl backdrop-blur-sm"
                title="Download Trailer"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {/* Quality Selector - Only show if multiple qualities available */}
              {trailerData.availableQualities.length > 1 && (
                <div>
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="netflix-button text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    disabled={isLoadingQuality}
                  >
                    {isLoadingQuality ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">
                      {currentQuality?.quality || 'Quality'}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${showQualityMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                   {/* Quality Menu */}
                  {showQualityMenu && (
                    <div className="absolute top-full mt-2 right-0 netflix-quality-menu rounded-lg min-w-[160px]">
                      {trailerData.availableQualities.map((quality: any) => (
                        <div key={quality.formatId} className="flex">
                          <button
                            onClick={() => changeQuality(quality)}
                            className={`flex-1 px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors first:rounded-tl-lg last:rounded-bl-lg flex items-center justify-between ${
                              currentQuality?.formatId === quality.formatId ? 'bg-red-600/20 text-red-400' : 'text-white'
                            }`}
                          >
                            <span>{quality.quality}</span>
                            <span className="text-xs text-gray-400">{quality.label}</span>
                          </button>
                          <button
                            onClick={() => downloadTrailer(quality)}
                            className="px-2 py-2 text-green-400 hover:bg-green-600/20 transition-colors first:rounded-tr-lg last:rounded-br-lg border-l border-gray-700"
                            title={`Download ${quality.quality}`}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen Button - only for direct video */}
          {!useYouTubeFallback && (
            <button
              onClick={() => {
                const video = document.querySelector('#trailer-video') as HTMLVideoElement;
                if (video) {
                  if (video.requestFullscreen) {
                    video.requestFullscreen();
                  } else if ((video as any).webkitRequestFullscreen) {
                    (video as any).webkitRequestFullscreen();
                  } else if ((video as any).msRequestFullscreen) {
                    (video as any).msRequestFullscreen();
                  }
                }
              }}
              className="absolute top-6 right-56 z-[110] bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-200 shadow-2xl backdrop-blur-sm"
              aria-label="Enter fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
          
          {/* Video Container - Choose between direct video and YouTube embed */}
          <div className="w-full h-full flex items-center justify-center p-0 m-0">
            {useYouTubeFallback && trailerData?.youtubeUrl ? (
              // YouTube Embed Fallback
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeVideoId(trailerData.youtubeUrl)}?autoplay=1&rel=0&showinfo=0&controls=1&fs=1&modestbranding=1`}
                className="w-full h-full bg-black"
                style={{ 
                  minWidth: '100vw', 
                  minHeight: '100vh',
                  border: 'none',
                  outline: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={`${movie.title || movie.name} - Official Trailer`}
              />
            ) : (
              // Direct Video Player
              <video
                id="trailer-video"
                src={trailerData.trailerUrl}
                controls
                autoPlay
                preload="metadata"
                className="w-full h-full object-contain bg-black max-w-none max-h-none"
                style={{ 
                  minWidth: '100vw', 
                  minHeight: '100vh',
                  outline: 'none'
                }}
                controlsList="nodownload"
                playsInline
                crossOrigin="anonymous"
                onError={handleVideoError}
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  console.log(`Video loaded: ${video.videoWidth}x${video.videoHeight}p at ${trailerData.trailerUrl}`);
                  
                  // Log actual video quality info
                  if (currentQuality) {
                    console.log(`Expected quality: ${currentQuality.quality} (${currentQuality.label})`);
                    console.log(`Actual video size: ${video.videoWidth}x${video.videoHeight}`);
                  }
                }}
                onCanPlay={() => {
                  console.log('Video can start playing');
                  setVideoError(false);
                }}
                onProgress={() => {
                  const video = document.querySelector('#trailer-video') as HTMLVideoElement;
                  if (video && video.buffered.length > 0) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    const duration = video.duration;
                    if (duration > 0) {
                      const percentBuffered = (bufferedEnd / duration) * 100;
                      console.log(`Video buffered: ${percentBuffered.toFixed(1)}%`);
                    }
                  }
                }}
              >
                <p className="text-white text-center p-8 absolute inset-0 flex items-center justify-center">
                  Your browser doesn't support HTML5 video. 
                  <a href={trailerData.trailerUrl} className="text-blue-400 underline ml-2" target="_blank" rel="noopener noreferrer">
                    Open trailer in new tab
                  </a>
                </p>
              </video>
            )}
          </div>
          
          {/* Video Info Overlay - Netflix Style */}
          <div className="absolute bottom-6 left-6 text-white z-[110] netflix-controls px-4 py-3 rounded-lg">
            <h3 className="text-lg font-bold text-white">{movie.title || movie.name}</h3>
            <p className="text-gray-300 text-sm">
              Official Trailer
              {useYouTubeFallback ? (
                <> • <span className="text-red-400 font-semibold">YouTube Player</span></>
              ) : (
                <>
                  {currentQuality && (
                    <> • <span className="text-green-400 font-semibold">{currentQuality.quality}</span> {currentQuality.label && `(${currentQuality.label})`}</>
                  )}
                  {trailerData?.availableQualities && trailerData.availableQualities.length > 0 && !currentQuality && (
                    <> • <span className="text-blue-400">HD Quality Available</span></>
                  )}
                  {!trailerData?.availableQualities || trailerData.availableQualities.length === 0 && (
                    <> • <span className="text-yellow-400">Auto Quality</span></>
                  )}
                </>
              )}
            </p>
          </div>
          
          {/* Controls Info - Netflix Style */}
          <div className="absolute bottom-6 right-6 text-white z-[110] netflix-controls px-4 py-3 rounded-lg">
            <p className="text-gray-300 text-sm">
              ESC to close • {!useYouTubeFallback && 'Download trailer • Change quality • '}Fullscreen
            </p>
                  </div>
          
          {/* Error Message Overlay */}
          {videoError && !useYouTubeFallback && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[105]">
              <div className="bg-red-600/90 text-white p-6 rounded-lg max-w-md text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Video Playback Error</h3>
                <p className="text-sm mb-4">The video format may not be supported by your browser.</p>
                {trailerData?.youtubeUrl && (
                  <button
                    onClick={() => setUseYouTubeFallback(true)}
                    className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Try YouTube Player
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Full Movie Player */}
      {showFullMovie && (
        <VideoPlayer
          tmdbId={movie.id}
          type="movie"
          title={movie.title || movie.name}
          onClose={() => setShowFullMovie(false)}
        />
      )}
    </>
  );
};

export default MovieModal;