import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import axios from 'axios';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Languages, SkipForward, SkipBack, ArrowLeft, Zap } from 'lucide-react';

interface VideoPlayerProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
  onClose: () => void;
}

interface AudioTrack {
  id: number;
  name: string;
  language: string;
  default: boolean;
}

interface StreamingSource {
  type: 'hls' | 'iframe';
  url: string;
  name: string;
  language?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  tmdbId, 
  type, 
  season, 
  episode, 
  title, 
  onClose 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const skipIntroTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [streamingSources, setStreamingSources] = useState<StreamingSource[]>([]);
  const [currentSource, setCurrentSource] = useState<StreamingSource | null>(null);
  const [isHLSSupported, setIsHLSSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForwardAnimation, setShowForwardAnimation] = useState(false);
  const [showBackwardAnimation, setShowBackwardAnimation] = useState(false);
  const [showCenterPlayButton, setShowCenterPlayButton] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('1080p');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Skip intro functionality
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [skipIntroStartTime] = useState(10); // Show button after 10 seconds
  const [skipIntroEndTime] = useState(100); // Hide button after 100 seconds (90 seconds duration)
  const [introSkipTime] = useState(90); // Skip to 90 seconds when clicked
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false); // Track if user has skipped intro
  const [skipIntroCountdown, setSkipIntroCountdown] = useState(0); // Countdown timer
  const [skipIntroAutoHide, setSkipIntroAutoHide] = useState(false); // Auto-hide state

  // Skip intro logic - improved to prevent re-showing
  useEffect(() => {
    // Don't show skip intro if user has already skipped it
    if (hasSkippedIntro) return;
    
    if (currentTime >= skipIntroStartTime && currentTime <= skipIntroEndTime && !showSkipIntro) {
      setShowSkipIntro(true);
      setSkipIntroAutoHide(false); // Reset auto-hide when button appears
    } else if ((currentTime < skipIntroStartTime || currentTime > skipIntroEndTime) && showSkipIntro) {
      setShowSkipIntro(false);
    }
    
    // Hide skip intro if we've already skipped past the intro time
    if (currentTime > introSkipTime && showSkipIntro) {
      setShowSkipIntro(false);
    }
    
    // Update countdown timer
    if (showSkipIntro && currentTime <= skipIntroEndTime) {
      const remaining = Math.max(0, skipIntroEndTime - currentTime);
      setSkipIntroCountdown(Math.ceil(remaining));
    }
  }, [currentTime, skipIntroStartTime, skipIntroEndTime, showSkipIntro, introSkipTime, hasSkippedIntro]);

  const handleSkipIntro = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = introSkipTime;
      setShowSkipIntro(false);
      setHasSkippedIntro(true); // Mark that user has skipped intro
    }
  }, [introSkipTime]);

  // Auto-hide skip intro button after 5 seconds
  useEffect(() => {
    if (showSkipIntro && !skipIntroAutoHide) {
      const timer = setTimeout(() => {
        setSkipIntroAutoHide(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showSkipIntro, skipIntroAutoHide]);

  // Video controls
  const togglePlayPause = useCallback(() => {
    console.log('togglePlayPause called, current isPlaying:', isPlaying);
    console.log('videoRef.current:', videoRef.current);
    
    if (!videoRef.current) {
      console.log('No video element found');
      return;
    }
    
    if (isPlaying) {
      console.log('Pausing video');
      videoRef.current.pause();
    } else {
      console.log('Playing video');
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Skip forward 30 seconds
  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime += 30;
      setShowForwardAnimation(true);
      setTimeout(() => setShowForwardAnimation(false), 1000);
    }
  }, []);

  // Skip backward 30 seconds
  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 30;
      setShowBackwardAnimation(true);
      setTimeout(() => setShowBackwardAnimation(false), 1000);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (playerContainerRef.current) {
        playerContainerRef.current.requestFullscreen().catch(console.error);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    }
  }, [isFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle keys when typing in inputs
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'Enter':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyS':
          e.preventDefault();
          if (showSkipIntro) {
            handleSkipIntro();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, skipBackward, skipForward, toggleFullscreen, toggleMute, onClose, showSkipIntro, handleSkipIntro]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Show center play button when paused
  useEffect(() => {
    if (!isPlaying && currentSource?.type === 'hls') {
      setShowCenterPlayButton(true);
    } else {
      setShowCenterPlayButton(false);
    }
  }, [isPlaying, currentSource]);

  // Handle double click on screen areas
  const handleScreenDoubleClick = (e: React.MouseEvent) => {
    if (currentSource?.type !== 'hls') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const screenWidth = rect.width;
    
    // Left side = backward, right side = forward
    if (clickX < screenWidth / 2) {
      skipBackward();
    } else {
      skipForward();
    }
  };

  // Generate streaming sources - Add dependency to prevent rapid re-generation
  useEffect(() => {
    const generateStreamingSources = async () => {
      const sources: StreamingSource[] = [];
      
      // Niggaflix streaming sources via backend
      if (type === 'movie') {
        try {
          const response = await axios.get(`/stream/movie/${tmdbId}`);
          if (response.data.stream) {
            sources.push({
              type: 'hls',
              url: response.data.stream.url,
              name: response.data.stream.name || 'Niggaflix HLS',
              language: response.data.stream.language || 'en'
            });
          }
        } catch (error) {
          console.log('Niggaflix movie not available:', error);
        }
      } else if (type === 'tv' && season && episode) {
        try {
          const response = await axios.get(`/stream/tv/${tmdbId}/${season}/${episode}`);
          if (response.data.stream) {
            sources.push({
              type: 'hls',
              url: response.data.stream.url,
              name: response.data.stream.name || 'Niggaflix HLS',
              language: response.data.stream.language || 'en'
            });
          }
        } catch (error) {
          console.log('Niggaflix TV episode not available:', error);
        }
      }
      
      // Iframe fallback sources (keep existing fallbacks)
      if (type === 'movie') {
        sources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
          name: 'VidSrc Player',
          language: 'multi'
        });
      } else if (type === 'tv' && season && episode) {
        sources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
          name: 'VidSrc Player',
          language: 'multi'
        });
      }
      
      // Only update if sources actually changed
      if (streamingSources.length === 0 || JSON.stringify(streamingSources) !== JSON.stringify(sources)) {
        setStreamingSources(sources);
        if (!currentSource && sources.length > 0) {
          setCurrentSource(sources[0]);
        }
      }
    };

    generateStreamingSources();
  }, [tmdbId, type, season, episode, streamingSources, currentSource]); // Added back dependencies to fix linter errors

  // Initialize HLS player - Add cleanup and prevent rapid initialization
  useEffect(() => {
    if (!currentSource || currentSource.type !== 'hls' || !videoRef.current) return;

    const video = videoRef.current;
    
    // Clean up existing HLS instance first
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

    setIsHLSSupported(Hls.isSupported());
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
        lowLatencyMode: false, // Disable low latency to prevent rapid switching
        backBufferLength: 90,
            maxBufferLength: 30,
        maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 2, // Reduced retries
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 2, // Reduced retries
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 3, // Reduced retries
        fragLoadingRetryDelay: 1000,
        startLevel: -1, // Let HLS choose the best level
        capLevelToPlayerSize: true,
        debug: false // Disable debug to reduce console spam
          });

          hlsRef.current = hls;
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setLoading(false);
        setError(null);
        
        // Only autoplay if not already playing
        if (video.paused) {
          video.play().catch((playError) => {
            console.warn('Autoplay failed:', playError);
            setIsPlaying(false);
          });
        }

            // Get available audio tracks
        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Track ${index + 1}`,
                language: track.lang || 'unknown',
                default: track.default
              }));
        
              setAudioTracks(tracks);
        
        // Set default audio track only if none selected
        if (selectedAudioTrack === -1 && tracks.length > 0) {
          const defaultTrack = tracks.find(track => track.default) || tracks[0];
          setSelectedAudioTrack(defaultTrack.id);
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error event:', event, data);
        
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, trying to recover...');
              hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover...');
              hls.recoverMediaError();
                  break;
                default:
              console.log('Fatal error, destroying HLS instance');
              hls.destroy();
              setError('Video playback failed. Please try a different source.');
                  break;
              }
            }
          });
      
      // Clean up on unmount
      return () => {
        if (hls) {
          hls.destroy();
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = currentSource.url;
      setLoading(false);
      video.play().catch((playError) => {
        console.warn('Autoplay failed:', playError);
        setIsPlaying(false);
      });
    } else {
      setError('HLS not supported in this browser');
    }
  }, [currentSource]); // Only depend on currentSource

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

          const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = (videoError: Event) => {
      console.error('Video element error:', videoError);
      if (currentSource?.type === 'hls') {
        // Try iframe fallback on video error
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
        } else {
          setError('Video playback failed. Please try again.');
          setLoading(false);
        }
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [currentSource, streamingSources]);

  // Handle loading state for iframe sources
  useEffect(() => {
    if (currentSource?.type === 'iframe') {
      setLoading(true);
      setError(null);
      
      // Set a timeout for iframe loading
      const iframeTimeout = setTimeout(() => {
        // If still loading after 10 seconds, assume iframe loaded successfully
        setLoading(false);
      }, 10000);
      
      return () => {
        clearTimeout(iframeTimeout);
      };
    }
  }, [currentSource]);

  // Audio track selection
  const handleAudioTrackChange = (trackId: string) => {
    const id = parseInt(trackId);
    setSelectedAudioTrack(id);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = id;
      console.log(`Switched to audio track: ${id}`);
    }
  };

  // Source switching
  const handleSourceChange = (sourceIndex: string) => {
    const index = parseInt(sourceIndex);
    const source = streamingSources[index];
    if (source) {
      setCurrentSource(source);
      setError(null);
      setLoading(true);
      console.log(`Switched to source: ${source.name}`);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  const enterFullscreen = () => {
    const container = document.querySelector('.video-player-container');
    if (container) {
      container.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  const handleQualityChange = (qualityOption: string) => {
    setQuality(qualityOption);
    setShowSettings(false);
    // In a real implementation, you would change the video source here
    console.log('Quality changed to:', qualityOption);
  };

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const qualityOptions = ['360p', '480p', '720p', '1080p', '1440p', '2160p'];

  // Mock video source - in real implementation, this would come from your backend
  const videoSrc = type === 'tv' 
    ? `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`
    : `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4`;

  return (
    <div 
      ref={playerContainerRef} 
      className="fixed inset-0 z-[200] bg-black"
      tabIndex={0}
      style={{ outline: 'none' }}
      onFocus={() => console.log('Video player focused')}
    >
      {/* Video/Iframe Container */}
      <div 
        className="relative w-full h-full"
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onDoubleClick={handleScreenDoubleClick}
        onClick={() => {
          // Focus the container when clicked to ensure keyboard events work
          if (playerContainerRef.current) {
            playerContainerRef.current.focus();
          }
        }}
      >
        {currentSource?.type === 'hls' ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            controls={false}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={currentSource?.url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            onLoad={() => {
              setLoading(false);
              setError(null);
            }}
            onError={() => {
              console.error('Iframe failed to load');
              setError('Video player failed to load. Please try a different source or refresh the page.');
              setLoading(false);
            }}
          />
        )}
        

        
        {/* Skip Forward Animation */}
        {showForwardAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-pulse">
              <div className="flex items-center gap-2 bg-black/80 text-white px-4 py-2 rounded-lg">
                <SkipForward className="w-6 h-6" />
                <span className="text-sm font-medium">+30s</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Skip Backward Animation */}
        {showBackwardAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-pulse">
              <div className="flex items-center gap-2 bg-black/80 text-white px-4 py-2 rounded-lg">
                <SkipBack className="w-6 h-6" />
                <span className="text-sm font-medium">-30s</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Skip Intro Button */}
        {showSkipIntro && currentSource?.type === 'hls' && (
          <div 
            className={`absolute top-1/2 right-8 transform -translate-y-1/2 pointer-events-auto z-50 transition-all duration-500 animate-fade-in ${
              skipIntroAutoHide ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            } hover:opacity-100 hover:translate-x-0`}
            onMouseEnter={() => setSkipIntroAutoHide(false)}
          >
            <button
              onClick={handleSkipIntro}
              className="group flex items-center gap-3 bg-black/80 hover:bg-black/90 backdrop-blur-md text-white px-6 py-4 rounded-xl font-semibold shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-blue-500/25 border border-white/20 hover:border-blue-400/50 skip-intro-pulse"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <span className="text-lg">Skip Intro</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-300 group-hover:text-white transition-colors">
                <span>→</span>
                <span className="font-mono">{Math.floor(introSkipTime / 60)}:{(introSkipTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                <span>(S)</span>
                <span className="text-blue-400">•</span>
                <span>{skipIntroCountdown}s</span>
              </div>
            </button>
          </div>
        )}
        
        {/* Pause Screen Overlay with Logo */}
        {!isPlaying && currentSource?.type === 'hls' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-center mb-8">
              {/* Logo */}
              <img 
                src="/logo.svg" 
                alt="CINEMA.FO" 
                className="h-16 sm:h-20 md:h-24 lg:h-32 w-auto mb-6 transition-all duration-300 filter brightness-110"
              />
              {/* Movie Title */}
              <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold px-4">{title}</h2>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-white">Loading video...</p>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-red-400 mb-4">{error}</p>
              <Button 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        {showControls && currentSource?.type === 'hls' && (
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none"
            style={{ pointerEvents: 'none' }}
          >
            {/* Back Button - Top Left */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg transition-all duration-300 pointer-events-auto"
            >
              <ArrowLeft size={20} />
              Back
      </button>

            {/* Movie Title - Top Center */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 text-center pointer-events-auto">
              <h1 className="text-white text-xl font-bold">{title}</h1>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-red-600 text-white">
                  {currentSource.name}
                </Badge>
                {currentSource.language && (
                  <Badge variant="outline" className="text-white border-white">
                    {currentSource.language.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Top Right Controls */}
            <div 
              className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quality Selector */}
              <select
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className="bg-black/70 text-white border border-gray-600 rounded px-3 py-2 text-sm hover:bg-black/90 transition-colors"
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>

              {/* Speed Selector */}
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-black/70 text-white border border-gray-600 rounded px-3 py-2 text-sm hover:bg-black/90 transition-colors"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">Normal</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>

              {/* Source Selector */}
              <div 
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => {}}
              >
                <Select 
                  value={streamingSources.indexOf(currentSource).toString()} 
                  onValueChange={handleSourceChange}
                  onOpenChange={(open) => {
                    if (open) {
                      console.log('Source selector opened');
                    }
                  }}
                >
                  <SelectTrigger 
                    className="w-40 bg-black/70 border-white/20 text-white hover:bg-black/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Source selector clicked');
                    }}
                  >
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    {streamingSources.map((source, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

      {/* Audio Track Selector */}
              {audioTracks.length > 0 && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setShowControls(true)}
                  onMouseLeave={() => {}}
                >
                  <Select 
                    value={selectedAudioTrack.toString()} 
                    onValueChange={handleAudioTrackChange}
                    onOpenChange={(open) => {
                      if (open) {
                        console.log('Audio track selector opened');
                      }
                    }}
                  >
                    <SelectTrigger 
                      className="w-40 bg-black/70 border-white/20 text-white hover:bg-black/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Audio track selector clicked');
                      }}
                    >
                      <Languages className="w-4 h-4" />
                      <SelectValue placeholder="Audio Track" />
              </SelectTrigger>
                    <SelectContent className="z-[250]">
                {audioTracks.map((track) => (
                        <SelectItem key={track.id} value={track.id.toString()}>
                    {track.name} ({track.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
              )}
        </div>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="relative w-full h-2 bg-gray-600 rounded-lg overflow-hidden">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-gray-700 rounded-lg"></div>
                  
                  {/* Gradient progress fill */}
                  <div 
                    className="absolute left-0 top-0 h-full gradient-progress-bar rounded-lg transition-all duration-200"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  ></div>
                  
                  {/* Invisible range input for interaction */}
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-300 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipBackward}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipForward}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Quality Display in Bottom Controls */}
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {quality}
                  </div>
                  
                  {/* Speed Display in Bottom Controls */}
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {playbackSpeed}x
                  </div>

                  {/* Settings Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
              </div>
            )}
        
        {/* Iframe Close Button */}
        {currentSource?.type === 'iframe' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white bg-black/60 hover:bg-black/80"
          >
            <X className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Custom Styles are handled via global CSS */}
    </div>
  );
};

export default VideoPlayer; 