import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
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

interface QualityLevel {
  height: number;
  width: number;
  bitrate: number;
  index: number;
  url: string | string[];
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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'quality' | 'speed' | 'audio'>('quality');
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 means auto
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
    
    console.log('Generated sources:', sources); // Debug log
      setStreamingSources(sources);
    setCurrentSource(sources[0] || null);
  }, [tmdbId, type, season, episode]);

  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;
  const errorTimeoutRef = useRef<NodeJS.Timeout>();

  // Function to switch to iframe
  const switchToIframe = useCallback(() => {
    console.log('Switching to iframe fallback');
    const iframeSource = streamingSources.find(s => s.type === 'iframe');
    if (iframeSource) {
      setCurrentSource(iframeSource);
      setError(null);
      setLoading(true);
      
      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    } else {
      setError('Video source unavailable. Please try again later.');
      setLoading(false);
    }
  }, [streamingSources]);

  // Reset retry count when source changes
  useEffect(() => {
    retryCountRef.current = 0;
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
  }, [currentSource?.url]);

  // Initialize HLS player with quality levels
  useEffect(() => {
    if (!currentSource || currentSource.type !== 'hls' || !videoRef.current) return;

    const video = videoRef.current;
    setIsHLSSupported(Hls.isSupported());
        
    if (Hls.isSupported()) {
      // First check if we can access the manifest
      fetch(currentSource.url, { method: 'HEAD' })
        .then(response => {
          if (!response.ok || response.redirected) {
            throw new Error('Manifest not accessible');
          }
        })
        .catch(() => {
          console.log('Cannot access manifest, switching to iframe immediately');
          switchToIframe();
          return;
        });

      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 1,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 6,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        manifestLoadingTimeOut: 5000, // Reduced timeout
        manifestLoadingMaxRetry: 0, // No manifest retries
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 5000, // Reduced timeout
        levelLoadingMaxRetry: 0, // No level retries
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 5000, // Reduced timeout
        fragLoadingMaxRetry: 0, // No fragment retries
        fragLoadingRetryDelay: 1000,
        startFragPrefetch: false, // Disable prefetch
        progressive: false, // Disable progressive loading
        lowLatencyMode: false,
        startLevel: -1,
        capLevelToPlayerSize: true
      });

      hlsRef.current = hls;
      
      let hasError = false;
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error event:', data);
        
        // If we already have an error being handled, ignore new ones
        if (hasError) return;
        hasError = true;

        // Switch to iframe for any error
        console.log('HLS error detected, switching to iframe');
        switchToIframe();
      });

      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log('Loading manifest...');
        // Set a timeout to switch to iframe if manifest doesn't load quickly
        errorTimeoutRef.current = setTimeout(() => {
          if (!hls.levels || hls.levels.length === 0) {
            console.log('Manifest load timeout, switching to iframe');
            switchToIframe();
          }
        }, 5000);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        console.log('Manifest loaded successfully');
        setLoading(false);
        video.play().catch(console.error);
      });

      // Load source
      console.log('Loading HLS source:', currentSource.url);
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);

      return () => {
        // Cleanup
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }
  }, [currentSource?.url, switchToIframe]);

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

  // Handle quality change
  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    
    const hls = hlsRef.current;
    
    if (levelIndex === -1) {
      // Auto quality
      hls.currentLevel = -1;
      hls.nextLevel = -1;
    } else {
      // Manual quality selection
      hls.currentLevel = levelIndex;
      hls.nextLevel = levelIndex;
    }
    
    setCurrentQuality(levelIndex);
    setShowSettingsMenu(false);
  };

  // Format quality label
  const getQualityLabel = (height: number) => {
    if (height <= 360) return '360p';
    if (height <= 480) return '480p';
    if (height <= 720) return '720p';
    if (height <= 1080) return '1080p';
    if (height <= 1440) return '1440p';
    return '4K';
  };

  // Settings menu auto-close timeout
  useEffect(() => {
    if (showSettingsMenu) {
      const timer = setTimeout(() => {
        setShowSettingsMenu(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSettingsMenu]);

  // Handle click outside settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const settingsMenu = document.querySelector('.settings-menu');
      const settingsButton = document.querySelector('.settings-button');
      
      if (settingsMenu && 
          !settingsMenu.contains(event.target as Node) && 
          !settingsButton?.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Settings menu UI
  const renderSettingsMenu = () => {
    if (!showSettingsMenu) return null;

    return (
      <div 
        className="settings-menu absolute bottom-20 right-4 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 p-4 w-64 space-y-4 z-50"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          // Reset auto-close timer when user interacts with menu
          const timer = setTimeout(() => {
            setShowSettingsMenu(false);
          }, 5000);
          return () => clearTimeout(timer);
        }}
      >
        {/* Settings Tabs */}
        <div className="flex space-x-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setSettingsTab('quality')}
            className={`px-3 py-1 rounded-lg text-sm ${settingsTab === 'quality' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Quality
          </button>
          <button
            onClick={() => setSettingsTab('speed')}
            className={`px-3 py-1 rounded-lg text-sm ${settingsTab === 'speed' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Speed
          </button>
          {audioTracks.length > 0 && (
            <button
              onClick={() => setSettingsTab('audio')}
              className={`px-3 py-1 rounded-lg text-sm ${settingsTab === 'audio' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Audio
            </button>
          )}
        </div>

        {/* Quality Settings */}
        {settingsTab === 'quality' && (
          <div className="space-y-2">
            <button
              onClick={() => handleQualityChange(-1)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${currentQuality === -1 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              <span>Auto</span>
              {currentQuality === -1 && <span className="text-blue-400">✓</span>}
            </button>
            {qualityLevels.map((level) => (
              <button
                key={level.index}
                onClick={() => handleQualityChange(level.index)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${currentQuality === level.index ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <span>{getQualityLabel(level.height)}</span>
                {currentQuality === level.index && <span className="text-blue-400">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Playback Speed Settings */}
        {settingsTab === 'speed' && (
          <div className="space-y-2">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  handleSpeedChange(speed);
                  setShowSettingsMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${playbackSpeed === speed ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                {playbackSpeed === speed && <span className="text-blue-400">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Audio Track Settings */}
        {settingsTab === 'audio' && (
          <div className="space-y-2">
            {audioTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  handleAudioTrackChange(track.id.toString());
                  setShowSettingsMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedAudioTrack === track.id ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <span>{track.name} ({track.language})</span>
                {selectedAudioTrack === track.id && <span className="text-blue-400">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
            </div>
            
            {/* Top Right Controls */}
            <div 
              className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Empty for now - removed duplicate controls */}
        </div>

            {/* Settings Menu */}
            {renderSettingsMenu()}
            
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
                    <div className="relative w-20 h-2">
                      {/* Background track */}
                      <div className="absolute inset-0 bg-gray-700 rounded-lg"></div>
                      
                      {/* Gradient progress fill */}
                      <div 
                        className="absolute left-0 top-0 h-full gradient-progress-bar rounded-lg transition-all duration-200"
                        style={{ width: `${(volume * 100)}%` }}
                      ></div>
                      
                      {/* Invisible range input for interaction */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    </div>
                  </div>

                  {/* Time Display */}
                  <div className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Quality Display */}
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {currentQuality === -1 ? 'AUTO' : getQualityLabel(qualityLevels[currentQuality]?.height || 1080)}
                  </div>
                  
                  {/* Speed Display */}
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {playbackSpeed}x
                  </div>

                  {/* Settings Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettingsMenu(!showSettingsMenu);
                    }}
                    className="settings-button text-white hover:bg-white/20"
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

        {/* Settings Menu */}
        {renderSettingsMenu()}
      </div>

      {/* Custom Styles are handled via global CSS */}
    </div>
  );
};

export default VideoPlayer; 