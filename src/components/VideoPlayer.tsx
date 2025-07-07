import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Languages, SkipForward, SkipBack, ArrowLeft } from 'lucide-react';
import AdSpot from './AdSpot';

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
  }, [togglePlayPause, skipBackward, skipForward, toggleFullscreen, toggleMute, onClose]);

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

  // Generate streaming sources
  useEffect(() => {
    const sources: StreamingSource[] = [];
    
    // HLS sources
    if (type === 'movie') {
      sources.push({
        type: 'hls',
        url: `https://mia.vidjoy.wtf/movies/${tmdbId}/index.m3u8`,
        name: 'Primary HLS',
        language: 'en'
      });
    } else if (type === 'tv' && season && episode) {
      sources.push({
        type: 'hls',
        url: `https://mia.vidjoy.wtf/tv/${tmdbId}/${season}/${episode}/index.m3u8`,
        name: 'Primary HLS',
        language: 'en'
      });
    }
    
    // Iframe fallback sources
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
    
    setStreamingSources(sources);
    setCurrentSource(sources[0] || null);
  }, [tmdbId, type, season, episode]);

  // Initialize HLS player
  useEffect(() => {
    if (!currentSource || currentSource.type !== 'hls' || !videoRef.current) return;

    const video = videoRef.current;
    setIsHLSSupported(Hls.isSupported());
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
            maxBufferLength: 30,
        maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 500,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 500,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
          });

          hlsRef.current = hls;
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setLoading(false);
        setError(null);
        video.play().catch((playError) => {
          console.warn('Autoplay failed:', playError);
          // Don't treat autoplay failure as a fatal error
        });

        // Get available audio tracks immediately
        console.log('Available audio tracks:', hls.audioTracks);
        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Track ${index + 1}`,
                language: track.lang || 'unknown',
                default: track.default
              }));
        
        console.log('Processed audio tracks:', tracks);
              setAudioTracks(tracks);
        
        // Set default audio track
              const defaultTrack = tracks.find(track => track.default);
              if (defaultTrack) {
          setSelectedAudioTrack(defaultTrack.id);
          console.log('Set default audio track:', defaultTrack);
              } else if (tracks.length > 0) {
          setSelectedAudioTrack(tracks[0].id);
          console.log('Set first audio track:', tracks[0]);
        }

        // Also check for audio tracks after a delay (sometimes they load later)
        setTimeout(() => {
          if (hls.audioTracks.length > tracks.length) {
            console.log('Additional audio tracks found after delay:', hls.audioTracks);
            const updatedTracks = hls.audioTracks.map((track, index) => ({
              id: index,
              name: track.name || `Track ${index + 1}`,
              language: track.lang || 'unknown',
              default: track.default
            }));
            setAudioTracks(updatedTracks);
            
            if (!selectedAudioTrack && updatedTracks.length > 0) {
              const defaultTrack = updatedTracks.find(track => track.default) || updatedTracks[0];
              setSelectedAudioTrack(defaultTrack.id);
              console.log('Set delayed audio track:', defaultTrack);
            }
          }
        }, 2000);
      });
      
      // Listen for audio track changes
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        console.log('Audio tracks updated:', hls.audioTracks);
        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Track ${index + 1}`,
          language: track.lang || 'unknown',
          default: track.default
        }));
        
        console.log('Updated processed audio tracks:', tracks);
        setAudioTracks(tracks);
        
        // Set default if not already set
        if (selectedAudioTrack === -1 && tracks.length > 0) {
          const defaultTrack = tracks.find(track => track.default) || tracks[0];
          setSelectedAudioTrack(defaultTrack.id);
          console.log('Set updated default audio track:', defaultTrack);
        }
      });
      
      // Listen for level loaded events (sometimes audio tracks are available after level loads)
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        if (hls.audioTracks.length > audioTracks.length) {
          console.log('New audio tracks found after level loaded:', hls.audioTracks);
          const tracks = hls.audioTracks.map((track, index) => ({
            id: index,
            name: track.name || `Track ${index + 1}`,
            language: track.lang || 'unknown',
            default: track.default
          }));
          
          setAudioTracks(tracks);
          
          if (selectedAudioTrack === -1 && tracks.length > 0) {
            const defaultTrack = tracks.find(track => track.default) || tracks[0];
            setSelectedAudioTrack(defaultTrack.id);
            console.log('Set level-loaded default audio track:', defaultTrack);
          }
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error event:', event, data);
        
        // Only handle fatal errors by switching to iframe fallback
        if (data.fatal) {
          console.log('Fatal HLS error, switching to iframe fallback');
          const iframeSource = streamingSources.find(s => s.type === 'iframe');
          if (iframeSource) {
            console.log('Switching to iframe fallback:', iframeSource.url);
            setCurrentSource(iframeSource);
            setError(null);
            setLoading(true);
          } else {
            setError('Video source unavailable. Please try again later.');
            setLoading(false);
          }
        }
      });

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
      });
      
      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime);
      });
      
      video.addEventListener('play', () => setIsPlaying(true));
      video.addEventListener('pause', () => setIsPlaying(false));
      
      video.addEventListener('error', (videoError) => {
        console.error('Video element error:', videoError);
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
        } else {
          setError('Video playback failed. Please try again.');
          setLoading(false);
        }
      });
      
      return () => {
        if (hls) {
          hls.destroy();
        }
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = currentSource.url;
      video.play().catch((playError) => {
        console.warn('Safari HLS autoplay failed, switching to iframe fallback');
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
        }
      });
      setLoading(false);
      setError(null);
    } else {
      // HLS not supported, use iframe fallback
      console.log('HLS not supported, using iframe fallback');
      const iframeSource = streamingSources.find(s => s.type === 'iframe');
      if (iframeSource) {
        setCurrentSource(iframeSource);
      }
    }
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
      className="fixed inset-0 z-[200] bg-black overflow-y-auto"
      tabIndex={0}
      style={{ outline: 'none' }}
      onFocus={() => console.log('Video player focused')}
    >
      {/* Player Page Ad - Shows before video loads or during loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="max-w-4xl w-full px-4">
            <AdSpot adKey="playerPageAd" className="mb-8" />
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-white">Loading video...</p>
            </div>
          </div>
        </div>
      )}
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
        
        {/* Center Play Button */}
        {showCenterPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="w-20 h-20 bg-black/60 hover:bg-black/80 text-white rounded-full pointer-events-auto"
            >
              <Play className="w-10 h-10" />
            </Button>
          </div>
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
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
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