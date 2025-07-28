import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Languages, SkipForward, SkipBack, ArrowLeft, Zap, RefreshCw, SkipForward as NextEpisode, Zap as SkipIntro } from 'lucide-react';

// Background HLS Prefetching Utility
class HLSPrefetcher {
  private prefetchedSegments = new Map<string, Blob>();
  private isPrefetching = false;
  private currentM3u8Url = '';

  async prefetchSegments(m3u8Url: string, startIndex: number = 20, endIndex: number = 60) {
    if (this.isPrefetching || this.currentM3u8Url === m3u8Url) return;
    
    this.isPrefetching = true;
    this.currentM3u8Url = m3u8Url;
    
    try {
      // Check network speed
      if ('connection' in navigator && (navigator as any).connection?.downlink < 2) {
        console.log('🚫 Network too slow for prefetching');
        return;
      }

      const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
      const response = await fetch(m3u8Url);
      const m3u8Text = await response.text();

      // Extract .ts segment links
      const lines = m3u8Text.split('\n').filter(line => line && !line.startsWith('#'));
      const segmentUrls = lines.map(line => baseUrl + line);

      const nextSegments = segmentUrls.slice(startIndex, endIndex);
      console.log(`🔄 Prefetching ${nextSegments.length} segments...`);

      // Prefetch segments in parallel with limited concurrency
      const batchSize = 5;
      for (let i = 0; i < nextSegments.length; i += batchSize) {
        const batch = nextSegments.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (url) => {
            try {
              const res = await fetch(url);
              const blob = await res.blob();
              this.prefetchedSegments.set(url, blob);
              console.log('✅ Prefetched:', url.split('/').pop());
            } catch (err) {
              console.warn('❌ Prefetch failed:', url, err);
            }
          })
        );
      }
      
      console.log(`🎉 Prefetching complete! ${this.prefetchedSegments.size} segments cached`);
    } catch (error) {
      console.error('❌ Prefetching error:', error);
    } finally {
      this.isPrefetching = false;
    }
  }

  getPrefetchedSegment(url: string): Blob | null {
    return this.prefetchedSegments.get(url) || null;
  }

  clearPrefetched() {
    this.prefetchedSegments.clear();
    this.currentM3u8Url = '';
  }
}

// Global prefetcher instance
const hlsPrefetcher = new HLSPrefetcher();

interface VideoPlayerProps {
  tmdbId?: number;
  type?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  onClose?: () => void;
  onNextEpisode?: () => void; // New prop for next episode callback
  onProgressUpdate?: (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => void; // Progress updates (videoElement only for final screenshots)
  initialTime?: number; // New prop for starting at a specific time
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
  tmdbId: propTmdbId, 
  type: propType, 
  season: propSeason, 
  episode: propEpisode, 
  title: propTitle, 
  onClose: propOnClose,
  onNextEpisode: propOnNextEpisode,
  onProgressUpdate: propOnProgressUpdate,
  initialTime: propInitialTime = 0
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get parameters from URL if not provided as props (for route usage)
  const tmdbId = propTmdbId || parseInt(searchParams.get('id') || '0');
  const type = propType || (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = propSeason || parseInt(searchParams.get('season') || '0');
  const episode = propEpisode || parseInt(searchParams.get('episode') || '0');
  const title = propTitle || searchParams.get('title') || 'Video';
  const initialTime = propInitialTime || parseFloat(searchParams.get('time') || '0');
  
  // Use prop callbacks if provided, otherwise use navigation
  const onClose = propOnClose || (() => navigate(-1));
  const onNextEpisode = propOnNextEpisode || (() => {
    // For route usage, navigate to next episode
    const nextEpisode = episode + 1;
    const nextSeason = season;
    navigate(`/watch?id=${tmdbId}&type=${type}&season=${nextSeason}&episode=${nextEpisode}&title=${encodeURIComponent(title)}`);
  });
  const onProgressUpdate = propOnProgressUpdate || (() => {
    // For route usage, we might want to save progress to localStorage or call an API
    console.log('Progress update for route video player');
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const currentSourceUrlRef = useRef<string>('');
  const skipIntroTimeoutRef = useRef<NodeJS.Timeout>();
  const skipIntroAutoHideRef = useRef<NodeJS.Timeout>();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  
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
  const [settingsTab, setSettingsTab] = useState<'speed' | 'audio'>('speed');
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // New states for Netflix-style features
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [skipIntroTimeRemaining, setSkipIntroTimeRemaining] = useState(90);
  const [isPlayPausePending, setIsPlayPausePending] = useState(false);
  const [bufferStallCount, setBufferStallCount] = useState(0);
  const bufferStallTimeoutRef = useRef<NodeJS.Timeout>();
  const [showSourceSwitchNotification, setShowSourceSwitchNotification] = useState(false);
  const sourceSwitchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Skip intro functionality removed

  // Fetch stream URLs from backend with encrypted niggaflix URLs
  const fetchStreamUrls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://cinemafo.lol/api';
      
      // Test backend connectivity first (optional)
      try {
        const testResponse = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        console.log('✅ Backend health check:', testResponse.status);
      } catch (testError) {
        console.log('⚠️ Backend health check failed, continuing with endpoints...');
      }
      
      // Try multiple endpoints in order of preference
      const endpoints = type === 'movie' 
        ? [
            `/official/movie/${tmdbId}`,
            `/niggaflix/movie/${tmdbId}`,
            `/stream/movie/${tmdbId}`
          ]
        : [
            `/official/tv/${tmdbId}/${season}/${episode}`,
            `/niggaflix/tv/${tmdbId}/${season}/${episode}`,
            `/stream/tv/${tmdbId}/${season}/${episode}`
          ];

      let streamUrl = null;
      let endpointUsed = '';

      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`🎬 Trying endpoint: ${baseUrl}${endpoint}`);
          
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000) // 15 second timeout
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.stream && data.stream.url) {
              streamUrl = data.stream.url;
              endpointUsed = endpoint;
              console.log(`✅ Stream URL found from ${endpoint}: ${streamUrl}`);
              break;
            }
          }
        } catch (error) {
          console.log(`❌ Endpoint ${endpoint} failed:`, error);
          if (error instanceof Error) {
            console.log(`Error type: ${error.name}, Message: ${error.message}`);
          }
          continue;
        }
      }
      
      if (streamUrl) {
        // Create sources array with encrypted niggaflix URL as primary
        const sources: StreamingSource[] = [
          {
            type: 'hls',
            url: streamUrl,
            name: `Niggaflix Stream (${endpointUsed})`,
            language: 'en'
          }
        ];

        // Add fallback iframe sources
        if (type === 'movie') {
          sources.push({
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
            name: 'VidSrc Player (Fallback)',
            language: 'multi'
          });
        } else if (type === 'tv' && season && episode) {
          sources.push({
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
            name: 'VidSrc Player (Fallback)',
            language: 'multi'
          });
        }

        setStreamingSources(sources);
        setCurrentSource(sources[0]);
        return;
      } else {
        console.log('⚠️ No stream URL found from backend, using iframe fallback');
        // Don't throw error, just use fallback
      }
      
      // If we reach here, no primary source was found, check if we have fallback sources
      const fallbackSources: StreamingSource[] = [];
      
      if (type === 'movie') {
        fallbackSources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
          name: 'VidSrc Player (Fallback)',
          language: 'multi'
        });
      } else if (type === 'tv' && season && episode) {
        fallbackSources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
          name: 'VidSrc Player (Fallback)',
          language: 'multi'
        });
      }

      if (fallbackSources.length > 0) {
        console.log('🔄 Using fallback sources:', fallbackSources);
        
        // Show notification for automatic fallback to secondary source
        setShowSourceSwitchNotification(true);
        
        // Auto-hide notification after 3 seconds
        if (sourceSwitchTimeoutRef.current) {
          clearTimeout(sourceSwitchTimeoutRef.current);
        }
        sourceSwitchTimeoutRef.current = setTimeout(() => {
          setShowSourceSwitchNotification(false);
        }, 3000);
        
        setStreamingSources(fallbackSources);
        setCurrentSource(fallbackSources[0]);
      } else {
        setError('This movie/show is not available on any streaming service at the moment. Please try again later or check back soon.');
      }
    } catch (error) {
      console.error('❌ Backend request failed:', error);
      
      // Fallback to iframe sources only
      const fallbackSources: StreamingSource[] = [];
      
      if (type === 'movie') {
        fallbackSources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
          name: 'VidSrc Player (Fallback)',
          language: 'multi'
        });
      } else if (type === 'tv' && season && episode) {
        fallbackSources.push({
          type: 'iframe',
          url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
          name: 'VidSrc Player (Fallback)',
          language: 'multi'
        });
      }

      if (fallbackSources.length > 0) {
        console.log('🔄 Using fallback sources:', fallbackSources);
        
        // Show notification for automatic fallback to secondary source
        setShowSourceSwitchNotification(true);
        
        // Auto-hide notification after 3 seconds
        if (sourceSwitchTimeoutRef.current) {
          clearTimeout(sourceSwitchTimeoutRef.current);
        }
        sourceSwitchTimeoutRef.current = setTimeout(() => {
          setShowSourceSwitchNotification(false);
        }, 3000);
        
        setStreamingSources(fallbackSources);
        setCurrentSource(fallbackSources[0]);
      } else {
        setError('This movie/show is not available on any streaming service at the moment. Please try again later or check back soon.');
      }
    } finally {
      setLoading(false);
    }
  }, [tmdbId, type, season, episode]);

  // Initialize sources on mount and when episode/season changes
  useEffect(() => {
    // Reset initialization flag when episode/season changes
    initializedRef.current = false;
      fetchStreamUrls();
    
    // Cleanup function to reset initialization when component unmounts
    return () => {
      initializedRef.current = false;
    };
  }, [tmdbId, type, season, episode]); // Re-run when these props change

  // Cleanup source switch notification timeout on unmount
  useEffect(() => {
    return () => {
      if (sourceSwitchTimeoutRef.current) {
        clearTimeout(sourceSwitchTimeoutRef.current);
      }
    };
  }, []);

  // Netflix-style features logic
  useEffect(() => {
    if (!videoRef.current || currentSource?.type !== 'hls') return;

    // Set initial time if provided
    if (initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;

      const currentTime = video.currentTime;
      const duration = video.duration;

    // Update state
    setCurrentTime(currentTime);
    setDuration(duration);

    // Save progress every 10 seconds with throttling
    if (onProgressUpdate && duration > 0) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastProgressUpdateRef.current;
      
      // Only update if at least 10 seconds have passed
      if (timeSinceLastUpdate >= 10000) {
        lastProgressUpdateRef.current = now;
        
        // Generate thumbnail every 60 seconds (every 6th progress update)
        const shouldGenerateThumbnail = Math.floor(currentTime / 60) > Math.floor((currentTime - 10) / 60);
        
        if (shouldGenerateThumbnail && video) {
          onProgressUpdate(currentTime, duration, video);
        } else {
          onProgressUpdate(currentTime, duration);
        }
      }
    }

      // Next Episode button logic (for TV shows only)
      if (type === 'tv' && duration > 0) {
        const timeRemaining = duration - currentTime;
        if (timeRemaining <= 120 && timeRemaining > 0) { // Last 2 minutes
          setShowNextEpisode(true);
        } else {
          setShowNextEpisode(false);
        }
      }

      // Skip Intro button logic
    if (currentTime <= 40) { // First 40 seconds
        setShowSkipIntro(true);
      setSkipIntroTimeRemaining(Math.max(0, 40 - currentTime));
      } else {
        setShowSkipIntro(false);
      }
    };

    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [type, currentSource?.type]);

  // Auto-hide skip intro button after 5 seconds
  useEffect(() => {
    if (showSkipIntro) {
      skipIntroAutoHideRef.current = setTimeout(() => {
        setShowSkipIntro(false);
      }, 5000);
    }

    return () => {
      if (skipIntroAutoHideRef.current) {
        clearTimeout(skipIntroAutoHideRef.current);
      }
    };
  }, [showSkipIntro]);

  // Skip intro function
  const handleSkipIntro = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const skipToTime = Math.min(video.currentTime + skipIntroTimeRemaining, 40);
    video.currentTime = skipToTime;
    setShowSkipIntro(false);
  }, [skipIntroTimeRemaining]);

  // Next episode function
  const handleNextEpisode = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎬 Next Episode button clicked in VideoPlayer');
    console.log('onNextEpisode callback exists:', !!onNextEpisode);
    
    if (onNextEpisode) {
      console.log('🎬 Calling onNextEpisode callback');
      onNextEpisode();
    } else {
      console.log('❌ No onNextEpisode callback provided');
    }
  }, [onNextEpisode]);

  // Video controls with debounce to prevent rapid play/pause errors
  // This prevents the "AbortError: The play() request was interrupted by a call to pause()" error
  // that occurs when users click the play/pause button too rapidly
  const togglePlayPause = useCallback(() => {
    console.log('togglePlayPause called, current isPlaying:', isPlaying);
    console.log('videoRef.current:', videoRef.current);
    
    if (!videoRef.current || isPlayPausePending) {
      console.log('No video element found or operation pending');
      return;
    }
    
    setIsPlayPausePending(true);
    
    // Safety timeout to reset pending state if something goes wrong
    const safetyTimeout = setTimeout(() => {
      setIsPlayPausePending(false);
    }, 2000);
    
    if (isPlaying) {
      console.log('Pausing video');
      videoRef.current.pause();
      // Small delay to prevent rapid state changes
      setTimeout(() => {
        clearTimeout(safetyTimeout);
        setIsPlayPausePending(false);
      }, 100);
    } else {
      console.log('Playing video');
      videoRef.current.play()
        .then(() => {
          console.log('Video play successful');
          clearTimeout(safetyTimeout);
          setIsPlayPausePending(false);
        })
        .catch((error) => {
          console.error('Error playing video:', error);
          // Only log the error if it's not an abort error (which is expected during rapid clicking)
          if (error.name !== 'AbortError') {
            console.error('Non-abort error playing video:', error);
          }
          clearTimeout(safetyTimeout);
          setIsPlayPausePending(false);
        });
    }
  }, [isPlaying, isPlayPausePending]);

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
          // Skip intro functionality removed
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            exitFullscreen();
          } else {
            // Capture final screenshot before closing
            if (videoRef.current && onProgressUpdate) {
              const currentTime = videoRef.current.currentTime;
              const duration = videoRef.current.duration;
              console.log('🎬 Closing video - calling onProgressUpdate with video element');
              console.log('🎬 Current time:', currentTime, 'Duration:', duration);
              onProgressUpdate(currentTime, duration, videoRef.current);
            }
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, skipBackward, skipForward, toggleFullscreen, toggleMute, onClose]);

  // Prevent body scroll when video player is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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

  // Reset play/pause pending state when source changes
  useEffect(() => {
    setIsPlayPausePending(false);
    setBufferStallCount(0);
    
    // Clear any existing buffer stall timeout
    if (bufferStallTimeoutRef.current) {
      clearTimeout(bufferStallTimeoutRef.current);
    }
  }, [currentSource?.url]);

  // Handle double click on screen areas
  const handleScreenDoubleClick = (e: React.MouseEvent) => {
    if (currentSource?.type !== 'hls') return;
    
    // Clear the single click timeout to prevent play/pause toggle
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
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

  const handleScreenClick = (e: React.MouseEvent) => {
    // Check if the click is on a control element
    const target = e.target as HTMLElement;
    const isControlClick = target.closest('button') || 
                          target.closest('input') || 
                          target.closest('.controls-overlay') ||
                          target.closest('.settings-menu') ||
                          target.closest('.settings-button') ||
                          target.closest('[type="range"]') ||
                          target.tagName === 'INPUT' ||
                          target.tagName === 'BUTTON';
    
    // Don't handle clicks on controls
    if (isControlClick) {
      return;
    }
    
    // Only handle single click if not part of a double click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    clickTimeoutRef.current = setTimeout(() => {
      // Single click: toggle play/pause only if not clicking on controls
      if (currentSource?.type === 'hls') {
        togglePlayPause();
      }
      // Focus the container for keyboard events
      playerContainerRef.current?.focus();
      clickTimeoutRef.current = null;
    }, 200); // 200ms is a good threshold for double-click
  };

  // Initialize HLS player with quality levels
  useEffect(() => {
    if (!currentSource || currentSource.type !== 'hls' || !videoRef.current) return;
    
    // Check if the source URL has actually changed
    if (currentSourceUrlRef.current === currentSource.url) {
      console.log('Source URL unchanged, skipping HLS initialization');
      return;
    }
    
    currentSourceUrlRef.current = currentSource.url;
    
    // Prevent multiple HLS instances
    if (hlsRef.current) {
      console.log('HLS instance already exists, destroying previous instance');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    setIsHLSSupported(Hls.isSupported());
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            // Buffer configuration to prevent stalling
            backBufferLength: 120, // Increased from 90
            maxBufferLength: 60, // Increased from 30
            maxMaxBufferLength: 600,
            maxBufferSize: 120 * 1000 * 1000, // Increased from 60MB to 120MB
            maxBufferHole: 0.5, // Reduced from 1 to be more tolerant
            highBufferWatchdogPeriod: 5, // Increased from 2
            nudgeOffset: 0.1, // Reduced from 0.2 for more frequent nudges
            nudgeMaxRetry: 10, // Increased from 6
            maxFragLookUpTolerance: 0.5, // Increased from 0.25
            // Live streaming settings (not needed for VOD)
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            // Loading timeouts
            manifestLoadingTimeOut: 30000, // Increased from 20000
            manifestLoadingMaxRetry: 6, // Increased from 4
            manifestLoadingRetryDelay: 2000, // Increased from 1000
            levelLoadingTimeOut: 30000, // Increased from 20000
            levelLoadingMaxRetry: 6, // Increased from 4
            levelLoadingRetryDelay: 2000, // Increased from 1000
            fragLoadingTimeOut: 60000, // Increased from 40000
            fragLoadingMaxRetry: 8, // Increased from 6
            fragLoadingRetryDelay: 2000, // Increased from 1000
            // Advanced settings
            startFragPrefetch: true,
            testBandwidth: true,
            progressive: true,
            lowLatencyMode: false,
            // Buffer settings
            maxLoadingDelay: 4 // Maximum delay for fragment loading
          });

          hlsRef.current = hls;
      
      // Load source only once
      console.log('Loading HLS source:', currentSource.url);
      hls.loadSource(currentSource.url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest parsed successfully');
        setLoading(false);
        setError(null);
        video.play().catch((playError) => {
          console.warn('Autoplay failed:', playError);
        });

        // Start background prefetching after manifest is parsed
        if (currentSource?.url) {
          console.log('🚀 Starting background prefetching...');
          hlsPrefetcher.prefetchSegments(currentSource.url);
        }



        // Get available audio tracks
        const tracks = hls.audioTracks.map((track, index) => ({
          id: index,
          name: track.name || `Track ${index + 1}`,
                language: track.lang || 'unknown',
                default: track.default
              }));
        
              setAudioTracks(tracks);
        
        // Set default audio track
              const defaultTrack = tracks.find(track => track.default);
              if (defaultTrack) {
          setSelectedAudioTrack(defaultTrack.id);
              } else if (tracks.length > 0) {
          setSelectedAudioTrack(tracks[0].id);
        }
      });
      

      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error event:', event, data);
        
        // Handle buffer stalling errors specifically
        if (data.details === 'bufferStalledError') {
          console.log('Buffer stalling detected, attempting recovery...');
          
          // Increment stall counter
          setBufferStallCount(prev => prev + 1);
          
          // Clear any existing timeout
          if (bufferStallTimeoutRef.current) {
            clearTimeout(bufferStallTimeoutRef.current);
          }
          
          // If multiple stalls occur, try to restart the stream
          if (bufferStallCount >= 3) {
            console.log('Multiple buffer stalls detected, attempting aggressive recovery');
            
            // Reset stall counter
            setBufferStallCount(0);
          }
          
          // If still having issues, try to restart the stream
          bufferStallTimeoutRef.current = setTimeout(() => {
            if (video.readyState === 0 || video.buffered.length === 0) {
              console.log('Attempting to restart stream due to persistent buffer issues');
              hls.stopLoad();
              hls.startLoad();
            }
          }, 3000);
          
          return;
        }
        
        // Handle other non-fatal errors
        if (!data.fatal) {
          console.log('Non-fatal HLS error, continuing playback');
          return;
        }
        
        // Handle fatal errors
        console.log('Fatal HLS error, attempting fallback');
        
        // Try to switch to iframe fallback
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          console.log('Switching to iframe fallback:', iframeSource.url);
          
          // Show notification for source switch
          setShowSourceSwitchNotification(true);
          
          // Auto-hide notification after 3 seconds
          if (sourceSwitchTimeoutRef.current) {
            clearTimeout(sourceSwitchTimeoutRef.current);
          }
          sourceSwitchTimeoutRef.current = setTimeout(() => {
            setShowSourceSwitchNotification(false);
          }, 3000);
          
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
        
          // Cleanup HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        } else {
          setError('Video source unavailable. Please try again later.');
          setLoading(false);
        }
      });

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
      });
      
      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime);
        
        // Monitor buffer health
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const currentTime = video.currentTime;
          const bufferAhead = bufferedEnd - currentTime;
          
          // If buffer is getting low, log a warning
          if (bufferAhead < 10 && bufferAhead > 0) {
            console.warn(`Low buffer detected: ${bufferAhead.toFixed(2)}s ahead`);
          }
          
          // If buffer is empty and video is playing, this might cause stalling
          if (bufferAhead <= 0 && !video.paused) {
            console.warn('Buffer underrun detected, video may stall soon');
          }
        }
      });
      
      video.addEventListener('play', () => setIsPlaying(true));
      video.addEventListener('pause', () => setIsPlaying(false));
      
      video.addEventListener('error', (videoError) => {
        console.error('Video element error:', videoError);
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          console.log('Video error, switching to iframe fallback');
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
          
          // Cleanup HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        } else {
          setError('Video playback failed. Please try again later.');
          setLoading(false);
        }
      });
      
      return () => {
        // Clean up event listeners
        if (video) {
          video.removeEventListener('loadedmetadata', () => setDuration(video.duration));
          video.removeEventListener('timeupdate', () => setCurrentTime(video.currentTime));
          video.removeEventListener('play', () => setIsPlaying(true));
          video.removeEventListener('pause', () => setIsPlaying(false));
          video.removeEventListener('error', (videoError) => {
            console.error('Video element error:', videoError);
            const iframeSource = streamingSources.find(s => s.type === 'iframe');
            if (iframeSource) {
              setCurrentSource(iframeSource);
              setError(null);
              setLoading(true);
            } else {
              setError('Video playback failed. Please try again later.');
              setLoading(false);
            }
          });
        }
        
        if (hls) {
          hls.destroy();
          hlsRef.current = null;
        }
        
        // Cleanup buffer stall timeout
        if (bufferStallTimeoutRef.current) {
          clearTimeout(bufferStallTimeoutRef.current);
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = currentSource.url;
      video.play().catch((playError) => {
        console.warn('Safari HLS autoplay failed:', playError);
        // Only switch to iframe if playback fails
        const iframeSource = streamingSources.find(s => s.type === 'iframe');
        if (iframeSource) {
          setCurrentSource(iframeSource);
          setError(null);
          setLoading(true);
        }
      });
      setLoading(false);
      setError(null);
        }
    
    // Cleanup function
      return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }
      currentSourceUrlRef.current = '';
      setIsPlayPausePending(false);
    };
  }, [currentSource?.url]); // Only re-run when the source URL changes

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
      // Show notification for manual source switch
      setShowSourceSwitchNotification(true);
      
      // Auto-hide notification after 3 seconds
      if (sourceSwitchTimeoutRef.current) {
        clearTimeout(sourceSwitchTimeoutRef.current);
      }
      sourceSwitchTimeoutRef.current = setTimeout(() => {
        setShowSourceSwitchNotification(false);
      }, 3000);
      
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
        // Only close if clicking outside both the menu and the settings button
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Settings menu hover timeout
  const settingsTimeoutRef = useRef<NodeJS.Timeout>();
  
  const handleSettingsMouseEnter = () => {
    if (settingsTimeoutRef.current) {
      clearTimeout(settingsTimeoutRef.current);
    }
  };

  const handleSettingsMouseLeave = () => {
    settingsTimeoutRef.current = setTimeout(() => {
      setShowSettingsMenu(false);
    }, 2000); // 2 second delay
  };

  // Settings menu UI
  const renderSettingsMenu = () => {
    if (!showSettingsMenu) return null;

    return (
      <div 
        className="settings-menu absolute bottom-20 right-4 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 p-4 w-64 space-y-4 z-50"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleSettingsMouseEnter}
        onMouseLeave={handleSettingsMouseLeave}
      >
        {/* Settings Tabs */}
        <div className="flex space-x-2 border-b border-white/10 pb-2">
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



        {/* Playback Speed Settings */}
        {settingsTab === 'speed' && (
          <div className="space-y-2">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  handleSpeedChange(speed);
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
        onClick={handleScreenClick}
        onDoubleClick={handleScreenDoubleClick}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
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
              setError('This content is not available on any streaming service at the moment. Please try again later or check back soon.');
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
        
        {/* Source Switch Notification */}
        {showSourceSwitchNotification && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="animate-pulse">
              <div className="flex items-center gap-2 bg-black/90 backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-blue-400/50 shadow-lg shadow-blue-500/30">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-sm font-medium">Switching to secondary source...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Skip Intro and Next Episode Buttons - Positioned on right side above progress bar */}
        {showControls && currentSource?.type === 'hls' && (
          <div className="absolute bottom-32 right-4 flex items-center gap-4 pointer-events-auto z-50">
            {/* Skip Intro Button */}
            {showSkipIntro && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkipIntro(e);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-blue-400/50 shadow-lg shadow-blue-500/30 hover:shadow-blue-400/50 hover:border-blue-300/70"
              >
                <SkipIntro className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Skip Intro ({Math.ceil(skipIntroTimeRemaining)}s)</span>
              </Button>
            )}

            {/* Next Episode Button - Only for TV shows */}
            {showNextEpisode && type === 'tv' && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextEpisode(e);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-white/20"
              >
                <NextEpisode className="w-4 h-4" />
                <span className="text-sm font-medium">Next Episode</span>
              </Button>
            )}
          </div>
        )}
        
        {/* Pause Screen Overlay with Logo */}
        {!isPlaying && currentSource?.type === 'hls' && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center pointer-events-none">
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-white">Loading video...</p>
            </div>
          </div>
        )}
        
        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center max-w-md">
                              <p className="text-blue-400 mb-4">{error}</p>
              <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => {
                    setRetryCount(prev => prev + 1);
                    fetchStreamUrls();
                }}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry ({retryCount})
                </Button>
                <Button onClick={() => {
                  // Capture final screenshot before closing
                  if (videoRef.current && onProgressUpdate) {
                    const currentTime = videoRef.current.currentTime;
                    const duration = videoRef.current.duration;
                    console.log('🎬 Close button clicked - calling onProgressUpdate with video element');
                    console.log('🎬 Current time:', currentTime, 'Duration:', duration);
                    onProgressUpdate(currentTime, duration, videoRef.current);
                  }
                  onClose();
                }} className="bg-blue-600 hover:bg-blue-700">
                  Close
              </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        {showControls && currentSource?.type === 'hls' && (
          <div 
            className="controls-overlay absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none"
            style={{ pointerEvents: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Back Button - Top Left */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Capture final screenshot before closing
                if (videoRef.current && onProgressUpdate) {
                  const currentTime = videoRef.current.currentTime;
                  const duration = videoRef.current.duration;
                  console.log('🎬 Back button clicked - calling onProgressUpdate with video element');
                  console.log('🎬 Current time:', currentTime, 'Duration:', duration);
                  onProgressUpdate(currentTime, duration, videoRef.current);
                }
                onClose();
              }}
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
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSeek(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      skipBackward();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    disabled={isPlayPausePending}
                    className={`text-white hover:bg-white/20 ${isPlayPausePending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isPlayPausePending ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipForward();
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  
                  <div 
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div 
                      className="relative w-20 h-2"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                    >
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
                      onChange={(e) => {
                        e.stopPropagation();
                        handleVolumeChange(e);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
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

        {/* Settings Menu - Outside controls overlay */}
        {renderSettingsMenu()}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="text-center p-8 max-w-md">
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h3 className="text-white text-xl font-semibold mb-4">Video Unavailable</h3>
              <p className="text-gray-300 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setError(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Try Again
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles are handled via global CSS */}
    </div>
  );
};

export default VideoPlayer; 