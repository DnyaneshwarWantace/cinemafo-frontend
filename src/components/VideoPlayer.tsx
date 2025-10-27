import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Languages, SkipForward, SkipBack, ArrowLeft, Zap, RefreshCw, SkipForward as NextEpisode, Zap as SkipIntro, Info } from 'lucide-react';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import api, { Movie, TVShow } from '@/services/api';

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
  // Debug logging for TV shows
  if (propType === 'tv') {
    console.log('🎬 VideoPlayer props for TV show:', {
      tmdbId: propTmdbId,
      type: propType,
      season: propSeason,
      episode: propEpisode,
      title: propTitle,
      initialTime: propInitialTime
    });
  }

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateProgress } = useWatchHistory();
  
  // Get parameters from URL if not provided as props (for route usage)
  const tmdbId = propTmdbId || parseInt(searchParams.get('id') || '0');
  const type = propType || (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const season = propSeason || parseInt(searchParams.get('season') || '0');
  const episode = propEpisode || parseInt(searchParams.get('episode') || '0');
  const title = propTitle || searchParams.get('title') || 'Video';
  const initialTime = propInitialTime || parseFloat(searchParams.get('time') || '0');

  console.log('🎬 VideoPlayer props:', { tmdbId, type, season, episode, title, propTmdbId, propType });

  // Use prop callbacks if provided, otherwise use navigation
  const onClose = propOnClose || (() => {
    // For TV shows, go back to home page instead of previous page in history
    // This prevents going back to previous episodes
    if (type === 'tv') {
      navigate('/');
    } else {
      navigate(-1);
    }
  });

  // If no valid tmdbId, don't render the player
  if (!tmdbId || tmdbId === 0) {
    console.error('❌ VideoPlayer: No valid tmdbId provided');
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Video ID</h2>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎬 Go Back button clicked for invalid video ID');
              onClose();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  const onNextEpisode = propOnNextEpisode || (async () => {
    // For route usage, fetch next episode info and navigate
    try {
      if (type === 'tv' && tmdbId && season && episode) {
        // Fetch season details to find next episode
        const response = await api.getShowSeason(tmdbId, season);
        const episodes = response.data.episodes || [];
        const currentEpisodeIndex = episodes.findIndex(ep => ep.episode_number === episode);
        
        if (currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1) {
          // Next episode in same season
          const nextEpisode = episodes[currentEpisodeIndex + 1];
          navigate(`/watch?id=${tmdbId}&type=${type}&season=${season}&episode=${nextEpisode.episode_number}&title=${encodeURIComponent(title)}`);
        } else {
          // Check if there's a next season
          const showResponse = await api.getShowDetails(tmdbId);
          const seasons = showResponse.data.seasons?.filter(s => s.season_number > 0) || [];
          const currentSeasonIndex = seasons.findIndex(s => s.season_number === season);
          
          if (currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1) {
            // Next season, first episode
            const nextSeason = seasons[currentSeasonIndex + 1];
            navigate(`/watch?id=${tmdbId}&type=${type}&season=${nextSeason.season_number}&episode=1&title=${encodeURIComponent(title)}`);
          } else {
            // No more episodes, go back to home
            navigate('/');
          }
        }
      }
    } catch (error) {
      console.error('Error navigating to next episode:', error);
      // Fallback: just increment episode number
      navigate(`/watch?id=${tmdbId}&type=${type}&season=${season}&episode=${episode + 1}&title=${encodeURIComponent(title)}`);
    }
  });
  const onProgressUpdate = propOnProgressUpdate || (async (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => {
    // For route usage, save progress to watch history
    try {
      if (tmdbId && type) {
        // Fetch content details if needed for progress update
        let content: Movie | TVShow | null = null;
        
        if (type === 'movie') {
          try {
            const response = await api.getMovieDetails(tmdbId);
            content = response.data;
            // Set actual duration from movie runtime (in minutes, convert to seconds)
            if (content.runtime) {
              setActualDuration(content.runtime * 60);
              console.log(`🎬 Movie duration set to: ${content.runtime} minutes (${content.runtime * 60} seconds)`);
            }
          } catch (err) {
            console.error('Failed to fetch movie details for progress update:', err);
            return;
          }
        } else if (type === 'tv') {
          try {
            const response = await api.getShowDetails(tmdbId);
            content = response.data;
            // Set actual duration from TV show runtime (in minutes, convert to seconds)
            if (content.runtime) {
              setActualDuration(content.runtime * 60);
              console.log(`🎬 TV show duration set to: ${content.runtime} minutes (${content.runtime * 60} seconds)`);
            }
          } catch (err) {
            console.error('Failed to fetch show details for progress update:', err);
            return;
          }
        }
        
        if (content) {
          updateProgress(
            content,
            getTotalWatchTime(),
            duration,
            type,
            type === 'tv' ? season : undefined,
            type === 'tv' ? episode : undefined,
            undefined, // episodeTitle
            videoElement
          );
        }
      }
    } catch (error) {
      console.error('Error updating progress in route video player:', error);
    }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  // Helper function to hide controls and clear timeout
  const hideControls = useCallback(() => {
    console.log('🔇 Hiding controls');
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = undefined;
    }
    setShowControls(false);
  }, []);
  const initializedRef = useRef(false);
  const currentSourceUrlRef = useRef<string>('');
  const skipIntroTimeoutRef = useRef<NodeJS.Timeout>();
  const skipIntroAutoHideRef = useRef<NodeJS.Timeout>();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
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

  // Picture-in-Picture states
  const [isPipEnabled, setIsPipEnabled] = useState(false);
  const [pipPermissionGranted, setPipPermissionGranted] = useState(false);
  const [isInPip, setIsInPip] = useState(false);
  const [lastUserGesture, setLastUserGesture] = useState<number>(0);
  const [bufferStallCount, setBufferStallCount] = useState(0);
  const bufferStallTimeoutRef = useRef<NodeJS.Timeout>();
  // Removed showSourceSwitchNotification and sourceSwitchTimeoutRef - no more auto-switch notifications
  const [isMobile, setIsMobile] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const iframeLoadTimeoutRef = useRef<NodeJS.Timeout>();
  const globalFallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const [iframeContentDetected, setIframeContentDetected] = useState(false);
  const [showSwitchSourceButton, setShowSwitchSourceButton] = useState(false);
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showServerInfo, setShowServerInfo] = useState(false);
  const [preservedTime, setPreservedTime] = useState<number>(0);
  const [hlsFailed, setHlsFailed] = useState(false);
  const [totalWatchTime, setTotalWatchTime] = useState<number>(0); // Total time watched across all servers
  const [lastServerSwitchTime, setLastServerSwitchTime] = useState<number>(0); // Time when last server switch happened
  const [actualDuration, setActualDuration] = useState<number>(0); // Actual duration from API
  const [playerCurrentTime, setPlayerCurrentTime] = useState<number>(0); // Current time from player
  const [playerDuration, setPlayerDuration] = useState<number>(0); // Duration from player
  const [playerProgress, setPlayerProgress] = useState<any>(null); // Full progress data from player
  const [iframeStartTime, setIframeStartTime] = useState<number>(0); // When iframe started playing
  const [iframeElapsedTime, setIframeElapsedTime] = useState<number>(0); // Manual elapsed time tracking
  
  // Timestamp preview state
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Skip intro functionality removed

  // Fetch stream URLs from backend with encrypted niggaflix URLs
  const fetchStreamUrls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://cinema.bz/api';
      
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

      // Try each endpoint until one works with retry logic
      for (const endpoint of endpoints) {
        let success = false;
        const maxRetries = 2;
        
        for (let retry = 0; retry <= maxRetries && !success; retry++) {
          try {
            if (retry > 0) {
              console.log(`🔄 Retry ${retry}/${maxRetries} for endpoint: ${baseUrl}${endpoint}`);
              // Add delay before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, retry * 1000));
            } else {
              console.log(`🎬 Trying endpoint: ${baseUrl}${endpoint}`);
            }
            
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.stream && data.stream.url) {
                streamUrl = data.stream.url;
                endpointUsed = endpoint;
                console.log(`✅ Stream URL found from ${endpoint} (attempt ${retry + 1}): ${streamUrl}`);
                success = true;
                break;
              }
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (error) {
            console.log(`❌ Endpoint ${endpoint} failed (attempt ${retry + 1}/${maxRetries + 1}):`, error);
            if (error instanceof Error) {
              console.log(`Error type: ${error.name}, Message: ${error.message}`);
            }
            
            // If this was the last retry, continue to next endpoint
            if (retry === maxRetries) {
              break;
            }
          }
        }
        
        // If we successfully got a stream URL, break out of the endpoint loop
        if (success) {
          break;
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
          sources.push(
            {
              type: 'iframe',
              url: `https://player.vidzee.wtf/embed/movie/${tmdbId}`,
              name: 'VidZee (Primary Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://player.videasy.net/movie/${tmdbId}`,
              name: 'Videasy (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidfast.pro/movie/${tmdbId}?autoPlay=true`,
              name: 'VidFast (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://v2.vidsrc.me/embed/movie/${tmdbId}`,
              name: 'VidSrc (Fallback)',
              language: 'multi'
            }
          );
        } else if (type === 'tv' && season && episode) {
          sources.push(
            {
              type: 'iframe',
              url: `https://player.vidzee.wtf/embed/tv/${tmdbId}/${season}/${episode}`,
              name: 'VidZee (Primary Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`,
              name: 'Videasy (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?autoPlay=true`,
              name: 'VidFast (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://v2.vidsrc.me/embed/tv/${tmdbId}/${season}/${episode}`,
              name: 'VidSrc (Fallback)',
              language: 'multi'
            }
          );
        }

        setStreamingSources(sources);
        setCurrentSource(sources[0]);
        setCurrentSourceIndex(0);
        return;
      } else {
        console.log('⚠️ No stream URL found from backend after retries, using iframe fallback');
        // Show specific error message based on what failed
        const timeoutOccurred = endpoints.some(endpoint => 
          document.querySelectorAll(`[data-endpoint="${endpoint}"]`).length > 0
        );
        
        if (timeoutOccurred) {
          console.log('🕒 Backend requests timed out - this may be due to high server load');
        }
      }
      
      // If we reach here, no primary source was found, build multiple iframe fallbacks
      const fallbackSources: StreamingSource[] = [];
      if (type === 'movie') {
        fallbackSources.push(
          {
            type: 'iframe',
            url: `https://player.vidzee.wtf/embed/movie/${tmdbId}`,
            name: 'VidZee - Primary Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://player.videasy.net/movie/${tmdbId}`,
            name: 'Videasy - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidfast.pro/movie/${tmdbId}?autoPlay=true`,
            name: 'VidFast - Fallback',
            language: 'multi'
          }
        );
      } else if (type === 'tv') {
        const seasonNum = season && season > 0 ? season : 1;
        const episodeNum = episode && episode > 0 ? episode : 1;
        fallbackSources.push(
          {
            type: 'iframe',
            url: `https://player.vidzee.wtf/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidZee - Primary Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://player.videasy.net/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'Videasy - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidfast.pro/tv/${tmdbId}/${seasonNum}/${episodeNum}?autoPlay=true`,
            name: 'VidFast - Fallback',
            language: 'multi'
          }
        );
      }

      if (fallbackSources.length > 0) {
        console.log('🔄 Using fallback sources after API timeout:', fallbackSources);
        
        // No notification - silent fallback
        
        setStreamingSources(fallbackSources);
        setCurrentSource(fallbackSources[0]);
        setCurrentSourceIndex(0);
      } else {
        setError('Backend servers are experiencing high load. Video streaming may be temporarily unavailable. Please try again in a few minutes.');
      }
    } catch (error) {
      console.error('❌ Backend request failed:', error);
      
      // Fallback to multiple iframe sources
      const fallbackSources: StreamingSource[] = [];
      if (type === 'movie') {
        fallbackSources.push(
          {
            type: 'iframe',
            url: `https://player.vidzee.wtf/embed/movie/${tmdbId}`,
            name: 'VidZee',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://player.videasy.net/movie/${tmdbId}`,
            name: 'Videasy',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidfast.pro/movie/${tmdbId}?autoPlay=true`,
            name: 'VidFast',
            language: 'multi'
          }
        );
      } else if (type === 'tv') {
        const seasonNum = season && season > 0 ? season : 1;
        const episodeNum = episode && episode > 0 ? episode : 1;
        fallbackSources.push(
          {
            type: 'iframe',
            url: `https://player.vidzee.wtf/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidZee',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://player.videasy.net/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'Videasy',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidfast.pro/tv/${tmdbId}/${seasonNum}/${episodeNum}?autoPlay=true`,
            name: 'VidFast',
            language: 'multi'
          }
        );
      }

      if (fallbackSources.length > 0) {
        console.log('🔄 Using fallback sources:', fallbackSources);
        
        // No notification - silent fallback
        
        console.log('🔄 Using fallback iframe:', fallbackSources[0]?.url);
        setStreamingSources(fallbackSources);
        setCurrentSource(fallbackSources[0]);
        setCurrentSourceIndex(0);
      } else {
        setError('This movie/show is not available on any streaming service at the moment. Please try again later or check back soon.');
      }
    } finally {
      setLoading(false);
    }
  }, [tmdbId, type, season, episode]);

  // Function to switch to next fallback source
  const switchToNextSource = useCallback(() => {
    const nextIndex = currentSourceIndex + 1;
    

    console.log(`🔄 Attempting to switch from source ${currentSourceIndex} to ${nextIndex} (total sources: ${streamingSources.length})`);
    
    if (nextIndex < streamingSources.length) {
      console.log(`✅ Switching to source ${nextIndex}: ${streamingSources[nextIndex].name}`);
      
      // Clear any existing timeouts
      if (globalFallbackTimeoutRef.current) {
        clearTimeout(globalFallbackTimeoutRef.current);
      }
      if (iframeLoadTimeoutRef.current) {
        clearTimeout(iframeLoadTimeoutRef.current);
      }
      
      // Preserve current playback time and pass it to the next server
      const video = videoRef.current;
      let currentPlaybackTime = 0;
      
      if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
        currentPlaybackTime = video.currentTime;
      } else if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
        currentPlaybackTime = playerCurrentTime;
      }
      
      if (currentPlaybackTime > 0) {
        setPreservedTime(currentPlaybackTime);
        setTotalWatchTime(currentPlaybackTime);
        console.log(`🔄 Auto-switch: Preserving timeline at ${currentPlaybackTime.toFixed(2)}s from ${currentSource?.type} server ${currentSourceIndex + 1}`);
        
        // Save current progress to continue watching before auto-switching servers
        if (onProgressUpdate && currentSource?.type === 'iframe') {
          const duration = playerDuration > 0 ? playerDuration : (actualDuration || (type === 'tv' ? 2700 : 7200));
          console.log(`💾 Saving iframe progress before auto-switch: ${currentPlaybackTime.toFixed(2)}s / ${duration}s`);
          onProgressUpdate(currentPlaybackTime, duration);
        }
      }
      
      // CRITICAL: Clean up HLS instance before switching to prevent conflicts
      if (hlsRef.current) {
        console.log('🧹 Cleaning up HLS instance before auto-switch');
        try {
          hlsRef.current.destroy();
          console.log('✅ HLS instance destroyed successfully');
        } catch (error) {
          console.warn('Error destroying HLS instance during auto-switch:', error);
        }
        hlsRef.current = null;
      }
      
      // Clear video source to prevent conflicts
      if (video) {
        video.src = '';
        video.load();
        console.log('🧹 Video source cleared');
      }
      
      // Reset player tracking for new server
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      setPlayerProgress(null);
      setLastServerSwitchTime(0);
      
      setCurrentSourceIndex(nextIndex);
      setCurrentSource(streamingSources[nextIndex]);
      setError(null);
      setLoading(true);
      setIframeContentDetected(false); // Reset content detection for new source
      setShowSwitchSourceButton(true); // Keep switch button visible for manual control
      setHlsFailed(false); // Reset HLS failure flag when auto-switching
      
      console.log(`✅ Auto-switch completed: Now using ${streamingSources[nextIndex].type} server ${nextIndex + 1}`);
      
      // Silent switching - no notifications
    } else {
      console.log('❌ No more sources available, showing error');
      setError('This content is not available on any streaming service at the moment. Please try again later or check back soon.');
      setLoading(false);
    }
  }, [currentSourceIndex, streamingSources]);

  // Function to test if iframe source is working
  const testIframeSource = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Try to fetch the iframe URL with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log('❌ Iframe source test failed:', url);
      return false;
    }
  }, []);

  // Test iframe source when it changes - disabled to prevent false switches
  // useEffect(() => {
  //   if (currentSource?.type === 'iframe') {
  //     const testSource = async () => {
  //       console.log('🧪 Testing iframe source:', currentSource.url);
  //       const isWorking = await testIframeSource(currentSource.url);
  //       if (!isWorking) {
  //         // If source doesn't work, switch to next one immediately
  //         console.log('❌ Iframe source test failed, switching immediately');
  //         switchToNextSource();
  //       } else {
  //         console.log('✅ Iframe source test passed');
  //       }
  //     };
      
  //     // Test the source immediately and also after a delay
  //     testSource(); // Immediate test
  //     const testTimeout = setTimeout(testSource, 5000); // Backup test after 5 seconds
      
  //     return () => {
  //       clearTimeout(testTimeout);
  //     };
  //   }
  // }, [currentSource, testIframeSource, switchToNextSource]);

  // Enhanced error handling for iframe fallback - only detect real failures
  useEffect(() => {
    const originalError = console.error;
    let errorCount = 0;
    let lastErrorTime = 0;

    console.error = (...args) => {
      const message = args[0]?.toString() || '';

      // Suppress common third-party player errors that are not real failures
      if (
        message.includes('TCF IFRAME LOCATOR API') || 
        message.includes('__tcfapiLocator') ||
        message.includes('CORS') ||
        message.includes('Cross-Origin') ||
        message.includes('Mixed Content') ||
        message.includes('SecurityError') ||
        message.includes('Permission denied') ||
        message.includes('Blocked a frame') ||
        message.includes('Refused to display') ||
        message.includes('Content Security Policy') ||
        message.includes('iframe') && message.includes('sandbox') ||
        message.includes('postMessage') ||
        message.includes('ResizeObserver') ||
        message.includes('Non-passive event listener') ||
        message.includes('passive event listener') ||
        message.includes('webkit') ||
        message.includes('moz') ||
        message.includes('ms') ||
        message.includes('vendor') ||
        message.includes('deprecated') ||
        message.includes('warning') ||
        message.includes('info') ||
        message.includes('debug')
      ) {
        return; // Ignore these common third-party player errors
      }

      // Enhanced error detection for iframe sources
      if (currentSource?.type === 'iframe') {
        // Detect 404 errors
        if (message.includes('404') || message.includes('Not Found')) {
          console.log(`🚨 404 Error detected from iframe source: ${message}`);
          setError(`Content not found on ${currentSource.name}. Please try a different server.`);
          setLoading(false);
          setShowSwitchSourceButton(true);
          return;
        }

        // Detect network errors
        if (message.includes('Failed to fetch') || 
            message.includes('NetworkError') || 
            message.includes('ERR_') ||
            message.includes('net::ERR_') ||
            message.includes('Connection refused')) {
          console.log(`🚨 Network Error detected: ${message}`);
          setError(`Network error on ${currentSource.name}. Please try a different server.`);
          setLoading(false);
          setShowSwitchSourceButton(true);
          return;
        }

        // Detect server errors
        if (message.includes('500') || 
            message.includes('502') || 
            message.includes('503') || 
            message.includes('504')) {
          console.log(`🚨 Server Error detected: ${message}`);
          setError(`Server error on ${currentSource.name}. Please try a different server.`);
          setLoading(false);
          setShowSwitchSourceButton(true);
          return;
        }

        // Detect timeout errors
        if (message.includes('timeout') || message.includes('TIMEOUT')) {
          console.log(`🚨 Timeout Error detected: ${message}`);
          setError(`Request timeout on ${currentSource.name}. Please try a different server.`);
          setLoading(false);
          setShowSwitchSourceButton(true);
          return;
        }
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [currentSource, switchToNextSource]);

  // Initialize sources on mount and when episode/season changes
  useEffect(() => {
    // Reset initialization flag when episode/season changes
    initializedRef.current = false;
    setCurrentSourceIndex(0);
    setHlsFailed(false); // Reset HLS failure flag
    setTotalWatchTime(0); // Reset total watch time
    setLastServerSwitchTime(0); // Reset server switch time
      fetchStreamUrls();
    
    // Cleanup function to reset initialization when component unmounts
    return () => {
      initializedRef.current = false;
    };
  }, [tmdbId, type, season, episode]); // Re-run when these props change

  // Global fallback timeout - force switch if nothing else works
  useEffect(() => {
    if (currentSource?.type === 'iframe' && streamingSources.length > 1) {
      // Clear any existing global timeout
      if (globalFallbackTimeoutRef.current) {
        clearTimeout(globalFallbackTimeoutRef.current);
      }
      
      // No global timeout - only show button on errors or manual trigger
      
      return () => {
        if (globalFallbackTimeoutRef.current) {
          clearTimeout(globalFallbackTimeoutRef.current);
        }
      };
    }
  }, [currentSource, streamingSources.length, switchToNextSource]);

  // Real-time iframe progress updates using player events
  useEffect(() => {
    if (currentSource?.type === 'iframe' && playerCurrentTime > 0 && onProgressUpdate) {
      // Trigger progress update when player time changes
      const duration = playerDuration > 0 ? playerDuration : (actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200));
      console.log(`📊 Iframe progress update: ${playerCurrentTime.toFixed(2)}s / ${duration}s (from player API)`);
      onProgressUpdate(playerCurrentTime, duration);
    }
  }, [currentSource?.type, playerCurrentTime, playerDuration, onProgressUpdate, actualDuration, type]);

  // Periodic iframe progress save to ensure continue watching is updated
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (currentSource?.type === 'iframe' && onProgressUpdate) {
      // Save progress every 10 seconds for iframe content
      intervalId = setInterval(() => {
        const duration = playerDuration > 0 ? playerDuration : (actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200));
        
        // Use player time if available, otherwise use manual tracking
        let currentTime = playerCurrentTime;
        if (currentTime <= 0 && iframeStartTime > 0) {
          // Manual time tracking: start time + elapsed time
          const elapsedTime = (Date.now() - iframeStartTime) / 1000;
          const startTime = preservedTime > 0 ? preservedTime : initialTime;
          currentTime = startTime + elapsedTime;
          setIframeElapsedTime(currentTime);
          console.log(`🕐 Manual iframe tracking: start=${startTime}s, elapsed=${elapsedTime.toFixed(2)}s, current=${currentTime.toFixed(2)}s`);
        }
        
        if (currentTime > 0) {
          console.log(`💾 Periodic iframe save: ${currentTime.toFixed(2)}s / ${duration}s`);
          onProgressUpdate(currentTime, duration);
        }
      }, 10000); // Every 10 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentSource?.type, playerCurrentTime, playerDuration, onProgressUpdate, actualDuration, type, iframeStartTime, preservedTime, initialTime]);

  // Listen for iframe content detection and user interaction
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from our iframe and indicates content is working
      if (event.origin.includes('vidzee') || event.origin.includes('player')) {
        if (event.data && typeof event.data === 'object') {
          // Handle VidZee MEDIA_DATA messages for watch progress
          if (event.data.type === 'MEDIA_DATA') {
            console.log('📺 Received media data from VidZee:', event.data);
            const mediaData = event.data.data;
            
            // Store progress in localStorage as per VidZee documentation
            if (mediaData && mediaData.id) {
              const progressData = {
                [mediaData.id]: {
                  id: mediaData.id,
                  type: mediaData.type || 'movie',
                  title: mediaData.title,
                  poster_path: mediaData.poster_path,
                  progress: {
                    watched: mediaData.progress?.watched || 0,
                    duration: mediaData.progress?.duration || 0
                  },
                  last_season_watched: mediaData.last_season_watched,
                  last_episode_watched: mediaData.last_episode_watched,
                  show_progress: mediaData.show_progress,
                  last_updated: Date.now()
                }
              };
              
              // Get existing progress and merge
              const existingProgress = JSON.parse(localStorage.getItem('vidZeeProgress') || '{}');
              const updatedProgress = { ...existingProgress, ...progressData };
              localStorage.setItem('vidZeeProgress', JSON.stringify(updatedProgress));
              
              console.log('💾 Updated VidZee progress in localStorage:', progressData);
            }
          }
          
          // Handle VidZee MEDIA_DATA for progress tracking (official API)
          if (event.data.type === 'MEDIA_DATA') {
            console.log('📺 VidZee MEDIA_DATA received:', event.data);
            const mediaData = event.data.data;
            if (mediaData && mediaData.progress) {
              setPlayerCurrentTime(mediaData.progress.watched || 0);
              setPlayerDuration(mediaData.progress.duration || 0);
              setPlayerProgress(mediaData);
              console.log(`📊 VidZee progress: ${mediaData.progress.watched}s / ${mediaData.progress.duration}s`);
            }
          }
          
          // Handle VidZee PLAYER_EVENT for real-time tracking (official API)
          if (event.data.type === 'PLAYER_EVENT') {
            console.log('📺 VidZee PLAYER_EVENT received:', event.data);
            const { event: eventType, currentTime, duration, mtmdbId, mediaType, season, episode } = event.data.data;
            setPlayerCurrentTime(currentTime || 0);
            setPlayerDuration(duration || 0);
            console.log(`📊 VidZee ${eventType}: ${currentTime}s / ${duration}s`);
            
            // Store full progress data for continue watching
            if (mtmdbId && mediaType) {
              const progressData = {
                id: mtmdbId,
                type: mediaType,
                currentTime: currentTime || 0,
                duration: duration || 0,
                season: season,
                episode: episode,
                lastUpdated: Date.now()
              };
              setPlayerProgress(progressData);
            }
          }
          
          // Handle Videasy progress messages (official API)
          if (event.data.type === 'progress' || event.data.type === 'timeupdate') {
            console.log('📺 Videasy progress received:', event.data);
            if (event.data.currentTime !== undefined) {
              setPlayerCurrentTime(event.data.currentTime);
              setPlayerDuration(event.data.duration || 0);
              console.log(`📊 Videasy progress: ${event.data.currentTime}s / ${event.data.duration || 0}s`);
            }
          }
          
          // Handle VidFast progress messages (official API)
          if (event.data.type === 'timeupdate' || event.data.type === 'seeked') {
            console.log('📺 VidFast progress received:', event.data);
            if (event.data.time !== undefined) {
              setPlayerCurrentTime(event.data.time);
              setPlayerDuration(event.data.duration || 0);
              console.log(`📊 VidFast progress: ${event.data.time}s / ${event.data.duration || 0}s`);
            }
          }
          
          // If we get any message from the iframe, content is likely working
          if (!iframeContentDetected) {
            console.log('✅ Iframe content detected - source is working');
            setIframeContentDetected(true);
            
            // Clear timeouts since content is working
            if (iframeLoadTimeoutRef.current) {
              clearTimeout(iframeLoadTimeoutRef.current);
            }
            if (globalFallbackTimeoutRef.current) {
              clearTimeout(globalFallbackTimeoutRef.current);
            }
            // Don't hide switch button - let user decide when to switch
          }
        }
      }
    };

    // Also detect user interaction with the iframe (clicking, etc.)
    const handleUserInteraction = () => {
      if (!iframeContentDetected && currentSource?.type === 'iframe') {
        console.log('✅ User interaction detected - iframe is working');
        setIframeContentDetected(true);
        
        // Clear timeouts since user can interact with content
        if (iframeLoadTimeoutRef.current) {
          clearTimeout(iframeLoadTimeoutRef.current);
        }
        if (globalFallbackTimeoutRef.current) {
          clearTimeout(globalFallbackTimeoutRef.current);
        }
        // Don't hide switch button - let user decide when to switch
      }
    };

    if (currentSource?.type === 'iframe') {
      window.addEventListener('message', handleMessage);
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
      return () => {
        window.removeEventListener('message', handleMessage);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };
    }
  }, [currentSource, iframeContentDetected]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Removed sourceSwitchTimeoutRef cleanup
      if (iframeLoadTimeoutRef.current) {
        clearTimeout(iframeLoadTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
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

    // Save progress every 5 seconds with throttling  
    if (onProgressUpdate && duration > 0) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastProgressUpdateRef.current;
      
      // Only update if at least 5 seconds have passed
      if (timeSinceLastUpdate >= 5000) {
        lastProgressUpdateRef.current = now;
        
        // Generate thumbnail every 60 seconds (every 6th progress update)
        const shouldGenerateThumbnail = Math.floor(currentTime / 60) > Math.floor((currentTime - 10) / 60);
        const totalWatchTimeNow = getTotalWatchTime();
        
        if (shouldGenerateThumbnail && video) {
          onProgressUpdate(totalWatchTimeNow, duration, video);
        } else {
          onProgressUpdate(totalWatchTimeNow, duration);
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
    // Fix: Use a more reliable skip time calculation
    const skipToTime = Math.min(video.currentTime + skipIntroTimeRemaining, video.duration - 1);
    
    // Ensure we don't skip beyond the video duration
    if (skipToTime < video.duration) {
    video.currentTime = skipToTime;
    }
    setShowSkipIntro(false);
  }, [skipIntroTimeRemaining]);

  // Calculate total watch time across all servers
  const getTotalWatchTime = useCallback(() => {
    const video = videoRef.current;
    
    // If currently on HLS server
    if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
      const timeWatchedOnCurrentServer = video.currentTime - lastServerSwitchTime;
      return totalWatchTime + Math.max(0, timeWatchedOnCurrentServer);
    }
    
    // If currently on iframe server - use player's current time
    if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
      console.log(`🎬 Iframe position (from player): ${playerCurrentTime.toFixed(2)}s`);
      return playerCurrentTime;
    }
    
    return totalWatchTime;
  }, [totalWatchTime, lastServerSwitchTime, currentSource?.type, playerCurrentTime]);

  // Build iframe URL with time parameter for timeline preservation
  const buildIframeUrlWithTime = useCallback((url: string, timeInSeconds: number) => {
    if (timeInSeconds <= 0) return url;
    
    const timeInMinutes = Math.floor(timeInSeconds / 60);
    const remainingSeconds = Math.floor(timeInSeconds % 60);
    
    // Try different parameter formats based on the player
    const separator = url.includes('?') ? '&' : '?';
    
    let urlWithTime = url;
    
    // Videasy player supports progress parameter
    if (url.includes('player.videasy.net') || url.includes('videasy.net')) {
      urlWithTime = `${url}${separator}progress=${Math.floor(timeInSeconds)}`;
    }
    // VidFast player - try different parameters
    else if (url.includes('vidfast.pro')) {
      urlWithTime = `${url}${separator}t=${Math.floor(timeInSeconds)}&time=${timeInMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    // VidZee player - try generic parameters
    else if (url.includes('vidzee.wtf') || url.includes('player.vidzee.wtf')) {
      urlWithTime = `${url}${separator}t=${Math.floor(timeInSeconds)}&progress=${Math.floor(timeInSeconds)}`;
    }
    // VidSrc player - supports t parameter for timeline
    else if (url.includes('vidsrc.me') || url.includes('v2.vidsrc.me')) {
      urlWithTime = `${url}${separator}t=${Math.floor(timeInSeconds)}`;
    }
    // Generic fallback
    else {
      urlWithTime = `${url}${separator}t=${Math.floor(timeInSeconds)}&time=${timeInMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    console.log(`🔄 Building iframe URL with time: ${timeInSeconds}s (${timeInMinutes}:${remainingSeconds.toString().padStart(2, '0')})`);
    console.log(`🔄 Original URL: ${url}`);
    console.log(`🔄 URL with time: ${urlWithTime}`);
    return urlWithTime;
  }, []);

  // Memoize iframe URL to prevent repeated rebuilding
  const iframeUrl = useMemo(() => {
    if (!currentSource?.url) return '';
    
    // Use preservedTime (from server switch) or initialTime (from continue watching)
    const timeToUse = preservedTime > 0 ? preservedTime : initialTime;
    
    if (timeToUse > 0) {
      console.log(`🔄 Building iframe URL with time: ${timeToUse}s (preserved: ${preservedTime}s, initial: ${initialTime}s)`);
      return buildIframeUrlWithTime(currentSource.url, timeToUse);
    }
    
    return currentSource.url;
  }, [currentSource?.url, preservedTime, initialTime, buildIframeUrlWithTime]);

  // Server switching with timeline preservation and watch time accumulation
  const switchServerWithTimeline = useCallback((newSourceIndex: number) => {
    if (newSourceIndex !== currentSourceIndex && newSourceIndex < streamingSources.length) {
      console.log(`🔄 Manual switch: From ${currentSource?.type} server ${currentSourceIndex + 1} to server ${newSourceIndex + 1}`);
      
      // Preserve current playback time and pass it to the next server
      const video = videoRef.current;
      let currentPlaybackTime = 0;
      
      if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
        currentPlaybackTime = video.currentTime;
      } else if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
        currentPlaybackTime = playerCurrentTime;
      }
      
      if (currentPlaybackTime > 0) {
        setPreservedTime(currentPlaybackTime);
        setTotalWatchTime(currentPlaybackTime);
        console.log(`🔄 Manual switch: Preserving timeline at ${currentPlaybackTime.toFixed(2)}s from ${currentSource?.type} server ${currentSourceIndex + 1} to server ${newSourceIndex + 1}`);
        
        // Save current progress to continue watching before switching servers
        if (onProgressUpdate && currentSource?.type === 'iframe') {
          const duration = playerDuration > 0 ? playerDuration : (actualDuration || (type === 'tv' ? 2700 : 7200));
          console.log(`💾 Saving iframe progress before server switch: ${currentPlaybackTime.toFixed(2)}s / ${duration}s`);
          onProgressUpdate(currentPlaybackTime, duration);
        }
      }
      
      // CRITICAL: Clean up HLS instance before switching to prevent conflicts
      if (hlsRef.current) {
        console.log('🧹 Cleaning up HLS instance before server switch');
        try {
          hlsRef.current.destroy();
          console.log('✅ HLS instance destroyed successfully');
        } catch (error) {
          console.warn('Error destroying HLS instance during switch:', error);
        }
        hlsRef.current = null;
      }
      
      // Clear video source to prevent conflicts
      if (video) {
        video.src = '';
        video.load();
        console.log('🧹 Video source cleared');
      }
      
      // Reset player tracking for new server
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      setPlayerProgress(null);
      setLastServerSwitchTime(0);
      
      setCurrentSourceIndex(newSourceIndex);
      setCurrentSource(streamingSources[newSourceIndex]);
      setError(null);
      setLoading(true);
      setIframeContentDetected(false);
      setHlsFailed(false); // Reset HLS failure flag when manually switching
      
      console.log(`✅ Server switch completed: Now using ${streamingSources[newSourceIndex].type} server ${newSourceIndex + 1}`);
    }
  }, [currentSourceIndex, streamingSources, lastServerSwitchTime, totalWatchTime]);

  // Next episode function
  const handleNextEpisode = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎬 Next Episode button clicked in VideoPlayer');
    console.log('onNextEpisode callback exists:', !!onNextEpisode);
    
    // Hide the next episode button immediately
    setShowNextEpisode(false);
    
    if (onNextEpisode) {
      console.log('🎬 Calling onNextEpisode callback');
      onNextEpisode();
    } else {
      console.log('❌ No onNextEpisode callback provided');
    }
  }, [onNextEpisode]);

  // Picture-in-Picture functionality
  const checkPipSupport = useCallback(() => {
    // Check basic PiP support
    const hasBasicPipSupport = !!(document as any).pictureInPictureEnabled &&
                               videoRef.current &&
                               (videoRef.current as any).requestPictureInPicture &&
                               currentSource?.type === 'hls';

    if (!hasBasicPipSupport) return false;

    // Mobile-specific checks
    if (isMobile) {
      // iOS Safari doesn't support PiP API, uses native video controls instead
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        console.log('iOS detected - PiP handled by native video controls');
        return false; // Let iOS handle PiP natively
      }

      // Android Chrome supports PiP from version 70+
      const isAndroidChrome = /Android.*Chrome/.test(navigator.userAgent);
      if (isAndroidChrome) {
        console.log('Android Chrome detected - PiP supported');
        return true;
      }

      // Other mobile browsers might not support PiP
      console.log('Mobile device detected - checking PiP API availability');
      return hasBasicPipSupport;
    }

    return hasBasicPipSupport;
  }, [currentSource, isMobile]);

  const requestPipPermission = useCallback(async () => {
    if (!checkPipSupport()) return false;

    // Always enable PiP optimistically - user gestures will be checked when needed
    setPipPermissionGranted(true);
    setIsPipEnabled(true);
    console.log('PiP enabled optimistically - will require user gesture for activation');
    return true;
  }, [checkPipSupport]);

  const enterPip = useCallback(async () => {
    if (!checkPipSupport()) return;

    // Check if already in PiP using the actual document state
    const actuallyInPip = !!(document as any).pictureInPictureElement;
    if (actuallyInPip) {
      console.log('Already in PiP according to document state');
      setIsInPip(true);
      return;
    }

    // Check if we have a recent user gesture (within last 2 minutes)
    const timeSinceGesture = Date.now() - lastUserGesture;
    const hasRecentGesture = timeSinceGesture < 120000;

    if (!hasRecentGesture) {
      const minutes = Math.floor(timeSinceGesture / 60000);
      const seconds = Math.floor((timeSinceGesture % 60000) / 1000);
      console.log(`No recent user gesture for PiP (${minutes}m ${seconds}s ago), skipping automatic PiP. Click anywhere to enable PiP.`);
      return;
    }

    try {
      const video = videoRef.current!;
      console.log('Attempting to enter PiP...', {
        readyState: video.readyState,
        paused: video.paused,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        timeSinceGesture: timeSinceGesture
      });

      // Ensure video is in a state where PiP can be requested
      if (video.readyState < 2 || video.paused) {
        console.log('Video not ready for PiP, attempting to play first');
        if (video.paused) {
          await video.play();
          // Wait a moment for video to start
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      await video.requestPictureInPicture();
      // Don't set state here - let the event handler do it
      console.log('PiP request successful');
    } catch (error) {
      console.error('Failed to enter PiP:', error);
      // Reset state to ensure we can try again
      setIsInPip(false);

      // If still getting user gesture errors, log helpful message
      if (error.name === 'NotAllowedError' && error.message.includes('user gesture')) {
        console.log('PiP requires user gesture - user needs to interact with the page before switching tabs');
      }
    }
  }, [checkPipSupport, lastUserGesture]);

  const exitPip = useCallback(async () => {
    // Check actual document state rather than just our state
    const actuallyInPip = !!(document as any).pictureInPictureElement;
    if (!actuallyInPip) {
      console.log('Not in PiP according to document state');
      setIsInPip(false);
      return;
    }

    try {
      console.log('Exiting PiP...');
      await (document as any).exitPictureInPicture();
      // Don't set state here - let the event handler do it
      console.log('PiP exit successful');
    } catch (error) {
      console.error('Failed to exit PiP:', error);
      // Force state sync
      setIsInPip(false);
    }
  }, []);

  // Handle back button action
  const handleBackButton = useCallback(() => {
    console.log('🎬 Handle back button called');
    // Capture final screenshot before closing
    if (onProgressUpdate) {
      // Use current server's playback time
      const video = videoRef.current;
      let finalTotalTime = 0;
      
      if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
        finalTotalTime = video.currentTime;
      } else if (currentSource?.type === 'iframe') {
        // For iframe, try multiple sources for current time
        if (playerCurrentTime > 0) {
          finalTotalTime = playerCurrentTime;
        } else if (iframeElapsedTime > 0) {
          finalTotalTime = iframeElapsedTime;
        } else if (iframeStartTime > 0) {
          // Manual time tracking: start time + elapsed time
          const elapsedTime = (Date.now() - iframeStartTime) / 1000;
          const startTime = preservedTime > 0 ? preservedTime : initialTime;
          finalTotalTime = startTime + elapsedTime;
        } else if (preservedTime > 0) {
          finalTotalTime = preservedTime;
        } else if (initialTime > 0) {
          finalTotalTime = initialTime;
        }
      }
      
      console.log(`📊 Universal Back: Using ${currentSource?.type} server time: ${finalTotalTime.toFixed(2)}s (${Math.floor(finalTotalTime/60)}:${Math.floor(finalTotalTime%60).toString().padStart(2, '0')})`);
      
      const duration = actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200);
      console.log('🎬 Universal back button - calling onProgressUpdate with total watch time');
      console.log('🎬 Final total watch time:', finalTotalTime, 'Duration:', duration);
      onProgressUpdate(finalTotalTime, duration, videoRef.current);
    }
    onClose();
  }, [onProgressUpdate, currentSource?.type, playerCurrentTime, iframeElapsedTime, iframeStartTime, preservedTime, initialTime, actualDuration, type, onClose]);

  // Handle server button click
  const handleServerButtonClick = useCallback(() => {
    console.log('🔄 Server button clicked, toggling dropdown');
    setShowServerDropdown(!showServerDropdown);
  }, [showServerDropdown]);

  // Enhanced video controls with better error handling and user feedback
  const togglePlayPause = useCallback(async () => {
    console.log('togglePlayPause called, current isPlaying:', isPlaying);

    if (!videoRef.current || isPlayPausePending) {
      console.log('No video element found or operation pending');
      return;
    }

    setIsPlayPausePending(true);

    // Safety timeout to reset pending state if something goes wrong
    const safetyTimeout = setTimeout(() => {
      setIsPlayPausePending(false);
    }, 3000);

    try {
      if (isPlaying) {
        console.log('Pausing video');
        videoRef.current.pause();
        // Small delay to prevent rapid state changes
        setTimeout(() => {
          clearTimeout(safetyTimeout);
          setIsPlayPausePending(false);
        }, 150);
      } else {
        console.log('Playing video');

        // Record user gesture when playing video (since play is usually user-initiated)
        const now = Date.now();
        setLastUserGesture(now);
        localStorage.setItem('lastUserGesture', now.toString());
        console.log('User gesture recorded from video play');

        // Request PiP permission when playing HLS videos
        if (currentSource?.type === 'hls') {
          await requestPipPermission();
        }

        // Enhanced play promise handling
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Video play successful');
        }
        
        clearTimeout(safetyTimeout);
        setIsPlayPausePending(false);
      }
    } catch (error: any) {
      console.error('Error in togglePlayPause:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        console.log('Play/pause operation was aborted (user clicked rapidly)');
      } else if (error.name === 'NotAllowedError') {
        console.log('Autoplay prevented by browser - user interaction required');
        setError('Please click the play button to start the video');
      } else if (error.name === 'NotSupportedError') {
        console.log('Video format not supported');
        setError('Video format not supported. Please try a different server.');
      } else {
        console.error('Unexpected error:', error);
        setError('An error occurred while playing the video. Please try again.');
      }
      
      clearTimeout(safetyTimeout);
      setIsPlayPausePending(false);
    }
  }, [isPlaying, isPlayPausePending, pipPermissionGranted, currentSource, requestPipPermission]);

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
      const video = videoRef.current;
      const container = playerContainerRef.current;

      // iOS Safari and some mobile browsers need video.webkitEnterFullscreen()
      if (isMobile && video && (video as any).webkitEnterFullscreen) {
        try {
          (video as any).webkitEnterFullscreen();
          return;
        } catch (error) {
          // iOS video fullscreen failed, try container fullscreen
        }
      }

      // Try container fullscreen for desktop and other mobile browsers
      if (container) {
        // Check for different fullscreen methods
        const requestFullscreen = container.requestFullscreen ||
                                 (container as any).webkitRequestFullscreen ||
                                 (container as any).webkitRequestFullScreen ||
                                 (container as any).mozRequestFullScreen ||
                                 (container as any).msRequestFullscreen;

        if (requestFullscreen) {
          requestFullscreen.call(container).then(() => {
            // After fullscreen is activated, try to lock to landscape on mobile
            if (screen.orientation && 'lock' in screen.orientation) {
              (screen.orientation as any).lock('landscape').catch((error: any) => {
                // Could not lock to landscape orientation
              });
            }
          }).catch((error: any) => {
            // Container fullscreen request failed
            // Try video fullscreen as fallback
            if (video && (video as any).webkitEnterFullscreen) {
              try {
                console.log('🔄 Fallback to video fullscreen');
                (video as any).webkitEnterFullscreen();
              } catch (videoError) {
                console.log('Video fullscreen fallback also failed:', videoError);
              }
            }
          });
        } else {
          // Fullscreen API not supported, try video fullscreen
          if (video && (video as any).webkitEnterFullscreen) {
            try {
              (video as any).webkitEnterFullscreen();
            } catch (videoError) {
              // Video fullscreen not available
            }
          }
        }
      }
    } else {
      // Exit fullscreen
      const video = videoRef.current;

      // First try to exit iOS video fullscreen
      if (video && (video as any).webkitExitFullscreen) {
        try {
          (video as any).webkitExitFullscreen();
          return;
        } catch (error) {
          console.log('iOS video exit fullscreen failed:', error);
        }
      }

      // Try standard document fullscreen exit
      const exitFullscreen = document.exitFullscreen || 
                            (document as any).webkitExitFullscreen || 
                            (document as any).webkitCancelFullScreen || 
                            (document as any).mozCancelFullScreen || 
                            (document as any).msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen.call(document).then(() => {
          // Unlock orientation when exiting fullscreen
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as any).unlock();
          }
        }).catch((error: any) => {
          console.log('Exit fullscreen failed:', error);
        });
      }
    }
  }, [isFullscreen, isMobile]);

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
            toggleFullscreen();
          } else {
            // Capture final screenshot before closing
            if (onProgressUpdate) {
              // Use iframe time directly if currently on iframe (replace, don't add)
              let finalTotalTime = totalWatchTime;
              if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
                finalTotalTime = playerCurrentTime;
                console.log(`📊 Escape: Using player current time: ${finalTotalTime.toFixed(2)}s (${Math.floor(finalTotalTime/60)}:${Math.floor(finalTotalTime%60).toString().padStart(2, '0')})`);
              } else {
                finalTotalTime = getTotalWatchTime();
              }
              
              const duration = actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200);
              console.log('🎬 Closing video - calling onProgressUpdate with video element');
              console.log('🎬 Final total watch time:', finalTotalTime, 'Duration:', duration);
              onProgressUpdate(finalTotalTime, duration, videoRef.current);
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

  // Track user interactions for PiP gesture requirement
  useEffect(() => {
    // Initialize from localStorage if available
    const storedGesture = localStorage.getItem('lastUserGesture');
    if (storedGesture) {
      const gestureTime = parseInt(storedGesture, 10);
      // Only use stored gesture if it's within the last 2 minutes
      if (Date.now() - gestureTime < 120000) {
        setLastUserGesture(gestureTime);
        console.log('Restored user gesture from storage');
      }
    }

    const trackUserGesture = () => {
      const now = Date.now();
      setLastUserGesture(now);
      // Store in localStorage to persist across navigation
      localStorage.setItem('lastUserGesture', now.toString());
      console.log('User gesture tracked');
    };

    // Listen for user interactions
    const events = isMobile
      ? ['touchstart', 'touchend', 'click', 'pointerdown'] // Mobile-focused events
      : ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown']; // Desktop events

    events.forEach(event => {
      document.addEventListener(event, trackUserGesture, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackUserGesture);
      });
    };
  }, []);

  // Picture-in-Picture auto-enter/exit on tab switch
  useEffect(() => {
    if (!isPipEnabled) return;

    const handleVisibilityChange = async (event?: Event) => {
      const eventType = event?.type || 'unknown';
      const isAppBackgrounding = eventType === 'pagehide' || eventType === 'beforeunload' || eventType === 'blur';

      console.log('PiP visibility change:', {
        eventType,
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        currentSource: currentSource?.type,
        videoExists: !!videoRef.current,
        videoPaused: videoRef.current?.paused,
        isPlaying,
        isPipEnabled,
        pipPermissionGranted,
        isInPip,
        isFullscreen,
        isMobile,
        isAppBackgrounding,
        userAgent: navigator.userAgent.substring(0, 50)
      });

      // Only handle PiP for HLS videos
      if (currentSource?.type !== 'hls' || !videoRef.current) return;

      // Skip PiP on iOS - it has native PiP in video controls
      if (isMobile && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        console.log('iOS device - skipping automatic PiP (use native video controls)');
        return;
      }

      // Check if page/app is being backgrounded
      const isBackgrounded = document.hidden ||
                             document.visibilityState === 'hidden' ||
                             (isMobile && isAppBackgrounding);

      if (isBackgrounded) {
        // Tab is hidden or minimized, enter PiP if video has been played
        const actuallyInPip = !!(document as any).pictureInPictureElement;
        if (!actuallyInPip && isPipEnabled) {
          console.log('Tab hidden - attempting to enter PiP...');

          // Mobile devices may need a longer delay
          const delay = isMobile ? 300 : 100;
          setTimeout(async () => {
            await enterPip();
          }, delay);
        }
      } else {
        // Tab is visible again, exit PiP
        const actuallyInPip = !!(document as any).pictureInPictureElement;
        if (actuallyInPip) {
          console.log('Tab visible - attempting to exit PiP...');
          await exitPip();
        }
      }
    };

    const handlePipEnter = () => {
      console.log('PiP entered via event');
      setIsInPip(true);
    };

    const handlePipExit = () => {
      console.log('PiP exited via event');
      setIsInPip(false);
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    videoRef.current?.addEventListener('enterpictureinpicture', handlePipEnter);
    videoRef.current?.addEventListener('leavepictureinpicture', handlePipExit);

    // Mobile-specific event listeners for app backgrounding
    if (isMobile) {
      // These events fire when mobile app goes to background (home button)
      window.addEventListener('pagehide', handleVisibilityChange);
      window.addEventListener('beforeunload', handleVisibilityChange);
      // Blur event can also indicate app backgrounding on mobile
      window.addEventListener('blur', handleVisibilityChange);

      console.log('Added mobile-specific backgrounding listeners');
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      videoRef.current?.removeEventListener('enterpictureinpicture', handlePipEnter);
      videoRef.current?.removeEventListener('leavepictureinpicture', handlePipExit);

      if (isMobile) {
        window.removeEventListener('pagehide', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleVisibilityChange);
        window.removeEventListener('blur', handleVisibilityChange);
      }
    };
  }, [isPipEnabled, currentSource, isInPip, isPlaying, isFullscreen, isMobile, enterPip, exitPip]);

  // Sync PiP state with actual document state periodically
  useEffect(() => {
    const syncPipState = () => {
      const actuallyInPip = !!(document as any).pictureInPictureElement;
      if (actuallyInPip !== isInPip) {
        console.log(`Syncing PiP state: ${isInPip} -> ${actuallyInPip}`);
        setIsInPip(actuallyInPip);
      }
    };

    const interval = setInterval(syncPipState, 1000);
    return () => clearInterval(interval);
  }, [isInPip]);

  // Fullscreen detection and orientation handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreenNow);
      
      // If exiting fullscreen, unlock orientation
      if (!isFullscreenNow) {
        if (screen.orientation && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
        }
        setIsLandscape(false);
      } else {
        // When entering fullscreen, try to lock orientation on mobile
        if (screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch((error: any) => {
            console.log('Could not lock to landscape orientation:', error);
          });
        }
      }
    };

    // iOS video fullscreen detection
    const handleVideoFullscreenChange = () => {
      const video = videoRef.current;
      if (video) {
        // iOS Safari video fullscreen detection
        const isVideoFullscreen = (video as any).webkitDisplayingFullscreen;
        console.log('📱 iOS video fullscreen state:', isVideoFullscreen);
        setIsFullscreen(isVideoFullscreen);
      }
    };

    // Mobile-specific fullscreen detection
    const handleMobileFullscreenChange = () => {
      if (isMobile) {
        // Check if we're in mobile fullscreen mode
        const isMobileFullscreen = window.innerHeight === screen.height && window.innerWidth === screen.width;
        if (isMobileFullscreen !== isFullscreen) {
          setIsFullscreen(isMobileFullscreen);
        }
      }
    };

    const handleOrientationChange = () => {
      if (screen.orientation) {
        const isLandscapeNow = screen.orientation.angle === 90 || screen.orientation.angle === 270;
        setIsLandscape(isLandscapeNow);
      }
    };

    // Add multiple event listeners for different browsers
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Add iOS video fullscreen listeners
    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleVideoFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleVideoFullscreenChange);
    }
    
    // Add mobile-specific fullscreen detection
    if (isMobile) {
      window.addEventListener('resize', handleMobileFullscreenChange);
      window.addEventListener('scroll', handleMobileFullscreenChange);
    }
    
    // Initial orientation check
    if (screen.orientation) {
      const isLandscapeNow = screen.orientation.angle === 90 || screen.orientation.angle === 270;
      setIsLandscape(isLandscapeNow);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('orientationchange', handleOrientationChange);

      // Remove iOS video fullscreen listeners
      const video = videoRef.current;
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleVideoFullscreenChange);
        video.removeEventListener('webkitendfullscreen', handleVideoFullscreenChange);
      }
      
      // Remove mobile-specific listeners
      if (isMobile) {
        window.removeEventListener('resize', handleMobileFullscreenChange);
        window.removeEventListener('scroll', handleMobileFullscreenChange);
      }
    };
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
    
    // Set timeout for iframe loading
    if (currentSource?.type === 'iframe') {
      // Clear any existing iframe timeout
      if (iframeLoadTimeoutRef.current) {
        clearTimeout(iframeLoadTimeoutRef.current);
      }
      
      // Set a timeout to show error message if iframe takes too long to load
      iframeLoadTimeoutRef.current = setTimeout(() => {
        if (!iframeContentDetected) {
          console.log('⏰ Iframe loading timeout - showing error message');
          setError(`Loading timeout on ${currentSource.name}. Please try a different server.`);
          setLoading(false);
          setShowSwitchSourceButton(true);
        }
      }, 15000); // 15 second timeout
    }
  }, [currentSource?.url, currentSource?.type, currentSource?.name]);

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
    // Check if the click is on a control element (excluding always-visible buttons)
    const target = e.target as HTMLElement;
    const isAlwaysVisibleButton = target.closest('.absolute.top-4.left-4') || // Back button
                                target.closest('.fixed.top-4.right-2') || // Server button
                                target.closest('.fixed.top-4.right-4');
    
    const isControlClick = target.closest('input') || 
                          target.closest('.controls-overlay') ||
                          target.closest('.settings-menu') ||
                          target.closest('.settings-button') ||
                          target.closest('[type="range"]') ||
                          target.closest('[data-server-dropdown]') ||
                          target.closest('[data-server-info]') ||
                          (target.tagName === 'INPUT') ||
                          // Only exclude buttons that are NOT the always-visible ones
                          (target.tagName === 'BUTTON' && !isAlwaysVisibleButton);
    
    // Don't handle clicks on controls
    if (isControlClick) {
      console.log('🎯 Click detected on control element, not hiding controls');
      return;
    }
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isMobile) {
      // On mobile: toggle controls visibility
      setShowControls(prev => !prev);
      
      // Auto-hide controls after 3 seconds if they're shown
      if (!showControls) {
        controlsTimeoutRef.current = setTimeout(() => {
          hideControls();
        }, 3000);
      }
    } else {
      // On PC: toggle play/pause
      togglePlayPause();
    }
    
    // Focus the container for keyboard events
    playerContainerRef.current?.focus();
  };

  // Initialize HLS player with quality levels
  useEffect(() => {
    if (!currentSource || currentSource.type !== 'hls' || !videoRef.current) return;
    
    // Check if the source URL has actually changed
    if (currentSourceUrlRef.current === currentSource.url) {
      console.log('Source URL unchanged, skipping HLS initialization');
      return;
    }
    
    console.log('🔄 HLS initialization starting for URL:', currentSource.url);
    currentSourceUrlRef.current = currentSource.url;
    
    // Add a flag to track if this effect is still active
    let isActive = true;
    
    // Prevent multiple HLS instances - ensure complete cleanup
    if (hlsRef.current) {
      console.log('🧹 HLS instance already exists, destroying previous instance');
      try {
      hlsRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying HLS instance:', error);
      }
      hlsRef.current = null;
    }

    // Also clear the video source to prevent conflicts
    const video = videoRef.current;
    if (video) {
      video.src = '';
      video.load();
    }
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
        if (!isActive) return; // Don't proceed if effect is no longer active
        console.log('HLS manifest parsed successfully');
        setLoading(false);
        setError(null);
        
        // Don't auto-play if we're resuming from a specific time (continue watching)
        if (initialTime === 0) {
        video.play().catch((playError) => {
          console.warn('Autoplay failed:', playError);
        });
        }

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
        if (!isActive) return; // Don't proceed if effect is no longer active
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
        
        // Handle fatal errors - auto-switch only for CORS and 404 errors
        console.log('Fatal HLS error:', data);
        
        // Check if it's a CORS error (origin blocked) or 404 error - auto-switch to next source
        const isCorsError = data.type === Hls.ErrorTypes.NETWORK_ERROR && 
            (data.details === 'manifestLoadError' || data.details === 'levelLoadError') &&
                           (!data.response || data.response.code === 0); // CORS errors often have code 0 or no response
        
        const is404Error = data.type === Hls.ErrorTypes.NETWORK_ERROR && 
                          (data.details === 'manifestLoadError' || data.details === 'levelLoadError') &&
                          data.response && data.response.code === 404;
        
        if (isCorsError || is404Error) {
          console.log('🚨 HLS server failed (CORS or 404 error), auto-switching to next source');
          setHlsFailed(true); // Trigger auto-switch
          // Auto-switch will be handled by the useEffect that monitors the hlsFailed state
          // No error message - silent switch
        } else {
          // For other fatal errors, show manual switch button
          console.log('Fatal HLS error, showing manual switch button');
          setShowSwitchSourceButton(true);
        }
        
        // Cleanup HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      });

      // Video event listeners
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
        
        // Set initial time if provided, or restore preserved time from server switch
        if (preservedTime > 0) {
          video.currentTime = preservedTime;
          setCurrentTime(preservedTime);
          setPreservedTime(0); // Reset preserved time
          console.log('🔄 Restored timeline to:', preservedTime);
        } else if (initialTime > 0) {
          video.currentTime = initialTime;
          setCurrentTime(initialTime);
          setTotalWatchTime(initialTime); // Set total watch time to initial time for continue watching
          setLastServerSwitchTime(initialTime); // Set server switch time to initial time
          console.log('Set initial time to:', initialTime, 'Total watch time set to:', initialTime);
        }
        
        // Try to enable PiP once metadata is loaded
        if (currentSource?.type === 'hls') {
          requestPipPermission();
        }
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
      
      video.addEventListener('play', () => {
        setIsPlaying(true);
        // Initial progress update when video starts playing
        if (onProgressUpdate && video.duration > 0) {
          console.log('🎬 Initial progress update on play start');
          onProgressUpdate(getTotalWatchTime(), video.duration);
        }
      });
      video.addEventListener('pause', () => setIsPlaying(false));
      
      // Auto-play next episode when video ends (for TV shows only)
      video.addEventListener('ended', () => {
        console.log('🎬 Video ended - checking if auto-play next episode');
        if (type === 'tv' && onNextEpisode) {
          console.log('🎬 Auto-playing next episode');
          onNextEpisode();
        }
      });
      
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
          video.removeEventListener('ended', () => {
            console.log('🎬 Video ended - checking if auto-play next episode');
            if (type === 'tv' && onNextEpisode) {
              console.log('🎬 Auto-playing next episode');
              onNextEpisode();
            }
          });
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
      
      // Handle initial time for continue watching
      video.addEventListener('loadedmetadata', () => {
        if (preservedTime > 0) {
          video.currentTime = preservedTime;
          setCurrentTime(preservedTime);
          setPreservedTime(0); // Reset preserved time
          console.log('🔄 Safari HLS: Restored timeline to:', preservedTime);
        } else if (initialTime > 0) {
          video.currentTime = initialTime;
          setCurrentTime(initialTime);
          setTotalWatchTime(initialTime); // Set total watch time to initial time for continue watching
          setLastServerSwitchTime(initialTime); // Set server switch time to initial time
          console.log('Safari HLS: Set initial time to:', initialTime, 'Total watch time set to:', initialTime);
        }
      });
      
      // Don't auto-play if we're resuming from a specific time (continue watching)
      if (initialTime === 0) {
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
      }
      setLoading(false);
      setError(null);
        }
    
    // Cleanup function
      return () => {
      console.log('🧹 HLS cleanup function called');
      isActive = false; // Mark as inactive
      if (hlsRef.current) {
        try {
        hlsRef.current.destroy();
          console.log('✅ HLS instance destroyed successfully');
        } catch (error) {
          console.warn('Error destroying HLS instance in cleanup:', error);
        }
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
      // No notification - silent switch
      
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

  // Enhanced click handler that uses the same calculation as hover
  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    // Hide preview after click
    setShowPreview(false);
    setPreviewTime(null);
  }, [duration]);

  const formatTime = (time: number) => {
    // Check for NaN or invalid time values
    if (isNaN(time) || !isFinite(time) || time < 0) {
      return '0:00';
    }
    
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Auto-switch logic: Only from HLS to first iframe, not between iframe servers
  useEffect(() => {
    // Only auto-switch if we're on HLS (main server) and HLS failed (CORS or 404)
    // Don't auto-switch between iframe servers - let user choose manually
    if (currentSource?.type === 'hls' && streamingSources.length > 1 && hlsFailed) {
      console.log('🚨 HLS server failed (CORS or 404), auto-switching to first iframe server');
      // Add a small delay to prevent rapid switching
      const switchTimeout = setTimeout(() => {
        switchToNextSource();
        setHlsFailed(false); // Reset the flag after switching
      }, 2000); // 2 second delay
      
      return () => clearTimeout(switchTimeout);
    }
  }, [hlsFailed, currentSource, streamingSources.length, switchToNextSource]);



  // Enhanced timestamp preview handler
  const handleProgressBarHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleProgressBarMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleProgressBarLeave = useCallback(() => {
    setShowPreview(false);
    setPreviewTime(null);
  }, []);

  // Global mouse leave handler to ensure tooltip disappears
  useEffect(() => {
    const handleGlobalMouseLeave = () => {
      setShowPreview(false);
      setPreviewTime(null);
    };

    const handleGlobalTouchEnd = () => {
      setShowPreview(false);
      setPreviewTime(null);
    };

    if (showPreview) {
      document.addEventListener('mouseleave', handleGlobalMouseLeave);
      document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
      return () => {
        document.removeEventListener('mouseleave', handleGlobalMouseLeave);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [showPreview]);

  // Enhanced mouse move handler for the progress bar
  const handleRangeInputMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleRangeInputMouseLeave = useCallback(() => {
    setShowPreview(false);
    setPreviewTime(null);
  }, []);

  // Touch event handlers for mobile
  const handleProgressBarTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
    
    // Auto-hide tooltip after 3 seconds on mobile to prevent it from getting stuck
    setTimeout(() => {
      setShowPreview(false);
      setPreviewTime(null);
    }, 3000);
  }, [duration]);

  const handleProgressBarTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleProgressBarTouchEnd = useCallback(() => {
    // Hide preview immediately on touch end for mobile
    setShowPreview(false);
    setPreviewTime(null);
  }, []);

  const handleRangeInputTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleRangeInputTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
  }, [duration]);

  const handleRangeInputTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.changedTouches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    // Hide preview immediately on touch end for mobile
    setShowPreview(false);
    setPreviewTime(null);
  }, [duration]);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        hideControls();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);


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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
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
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('touchend', handleClickOutside);
      };
    }
  }, [showSettingsMenu]);

  // Handle click outside server dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const serverDropdown = document.querySelector('[data-server-dropdown]');
      const serverInfo = document.querySelector('[data-server-info]');
      
      // Close server dropdown if clicking outside
      if (showServerDropdown && serverDropdown && !serverDropdown.contains(target)) {
        console.log('🎬 Clicking outside server dropdown, closing...');
        setShowServerDropdown(false);
      }
      
      // Close server info if clicking outside
      if (showServerInfo && serverInfo && !serverInfo.contains(target)) {
        console.log('🎬 Clicking outside server info, closing...');
        setShowServerInfo(false);
      }
    };

    if (showServerDropdown || showServerInfo) {
      // Add event listeners immediately for better responsiveness
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showServerDropdown, showServerInfo]);

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
        className={`settings-menu absolute bottom-20 right-0 sm:right-4 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 p-1.5 sm:p-4 w-40 sm:w-64 max-w-[calc(100vw-0.25rem)] max-h-[calc(100vh-6rem)] overflow-y-auto space-y-1 sm:space-y-4 z-50 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent ${isFullscreen ? 'fullscreen-settings-menu' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={handleSettingsMouseEnter}
        onMouseLeave={handleSettingsMouseLeave}
      >
        {/* Settings Tabs */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-xl flex space-x-0 sm:space-x-2 border-b border-white/10 pb-0.5 sm:pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsTab('speed');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSettingsTab('speed');
            }}
            className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm touch-manipulation min-h-[28px] sm:min-h-[36px] ${settingsTab === 'speed' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Speed
          </button>
          {audioTracks.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsTab('audio');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSettingsTab('audio');
              }}
              className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm touch-manipulation min-h-[28px] sm:min-h-[36px] ${settingsTab === 'audio' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Audio
            </button>
          )}
        </div>



        {/* Playback Speed Settings */}
        {settingsTab === 'speed' && (
          <div className="space-y-0 sm:space-y-2">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
              <button
                key={speed}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeedChange(speed);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSpeedChange(speed);
                }}
                className={`w-full text-left px-1 sm:px-3 py-0.5 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between touch-manipulation min-h-[28px] sm:min-h-[40px] ${playbackSpeed === speed ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                {playbackSpeed === speed && <span className="text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Audio Track Settings */}
        {settingsTab === 'audio' && (
          <div className="space-y-0 sm:space-y-2">
            {audioTracks.map((track) => (
              <button
                key={track.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAudioTrackChange(track.id.toString());
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAudioTrackChange(track.id.toString());
                }}
                className={`w-full text-left px-1 sm:px-3 py-0.5 sm:py-2 rounded-lg text-xs sm:text-sm flex items-center justify-between touch-manipulation min-h-[28px] sm:min-h-[40px] ${selectedAudioTrack === track.id ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <span className="truncate">{track.name} ({track.language})</span>
                {selectedAudioTrack === track.id && <span className="text-blue-500 flex-shrink-0">✓</span>}
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
      className={`fixed inset-0 z-[200] bg-black ${isFullscreen ? 'fullscreen-container' : ''}`}
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
        onMouseLeave={() => isPlaying && hideControls()}
        onTouchStart={(e) => {
          if (isMobile) {
            // Check if touch is on a control element (excluding always-visible buttons)
            const target = e.target as HTMLElement;
            const isAlwaysVisibleButton = target.closest('.absolute.top-4.left-4') || // Back button
                                        target.closest('.fixed.top-4.right-2') || // Server button
                                        target.closest('.fixed.top-4.right-4');
            
            const isControlTouch = target.closest('input') || 
                                  target.closest('.controls-overlay') ||
                                  target.closest('.settings-menu') ||
                                  target.closest('.settings-button') ||
                                  target.closest('[type="range"]') ||
                                  target.closest('[data-server-dropdown]') ||
                                  target.closest('[data-server-info]') ||
                                  (target.tagName === 'INPUT') ||
                                  // Only exclude buttons that are NOT the always-visible ones
                                  (target.tagName === 'BUTTON' && !isAlwaysVisibleButton);
            
            // Don't handle touches on controls
            if (isControlTouch) {
              console.log('🎯 Touch detected on control element, not toggling controls');
              return;
            }
            
            // Clear any existing timeout
            if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
            }
            
            // Toggle controls visibility on touch
            setShowControls(prev => {
              const newShowControls = !prev;
              console.log(`📱 Mobile touch: Controls ${prev ? 'hidden' : 'visible'} → ${newShowControls ? 'visible' : 'hidden'}`);
              
              // Auto-hide controls after 3 seconds if they're being shown
              if (newShowControls) {
                console.log('⏰ Setting 3-second auto-hide timeout');
                controlsTimeoutRef.current = setTimeout(() => {
                  console.log('⏰ Auto-hiding controls after 3 seconds');
                  hideControls();
                }, 3000);
              }
              
              return newShowControls;
            });
            
            // Prevent default touch behavior to avoid conflicts
            e.preventDefault();
          }
        }}
        onTouchEnd={(e) => {
          if (isMobile) {
            // Prevent default touch behavior
            e.preventDefault();
            e.stopPropagation();
            console.log('📱 Touch end event');
          }
        }}
        onTouchMove={(e) => {
          if (isMobile) {
            // Prevent scrolling during touch interactions
            e.preventDefault();
          }
        }}
      >
        {currentSource?.type === 'hls' ? (
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${isFullscreen ? 'fullscreen-video' : ''}`}
            playsInline
            controls={false}
            autoPlay
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5"
            x5-video-player-fullscreen="true"
            x5-video-orientation="landscape"
            preload="metadata"
          />
        ) : (
          <iframe
            key={`iframe-${currentSource?.url}-no-sandbox`}
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            onLoad={() => {
              setLoading(false);
              setError(null);

              // Clear any pending timeout
              if (iframeLoadTimeoutRef.current) {
                clearTimeout(iframeLoadTimeoutRef.current);
              }

              // Clear global fallback timeout since iframe loaded successfully
              if (globalFallbackTimeoutRef.current) {
                clearTimeout(globalFallbackTimeoutRef.current);
              }
              
              console.log('✅ Iframe loaded successfully');
              console.log(`🕐 Iframe loaded, waiting for player API events...`);
              
              // Set iframe start time for manual tracking
              setIframeStartTime(Date.now());
              console.log(`🕐 Iframe start time set: ${Date.now()}`);
              
              // Try to seek to preserved time or initial time if available
              const timeToSeek = preservedTime > 0 ? preservedTime : initialTime;
              if (timeToSeek > 0 && iframeRef.current) {
                console.log(`🔄 Attempting to seek iframe to ${timeToSeek}s (preserved: ${preservedTime}s, initial: ${initialTime}s)`);
                console.log(`🔄 Current iframe URL: ${iframeRef.current.src}`);
                const iframe = iframeRef.current;
                const currentUrl = currentSource?.url || '';
                const timeInMinutes = Math.floor(timeToSeek / 60);
                const remainingSeconds = Math.floor(timeToSeek % 60);
                
                // Try different postMessage formats based on the player
                setTimeout(() => {
                  // VidZee player - based on their documentation
                  if (currentUrl.includes('vidzee.wtf') || currentUrl.includes('player.vidzee.wtf')) {
                    iframe.contentWindow?.postMessage({ 
                      type: 'SEEK', 
                      time: Math.floor(timeToSeek),
                      seconds: Math.floor(timeToSeek)
                    }, 'https://vidzee.wtf');
                  }
                  // Videasy player - try their format
                  else if (currentUrl.includes('player.videasy.net') || currentUrl.includes('videasy.net')) {
                    iframe.contentWindow?.postMessage({ 
                      type: 'seek', 
                      time: Math.floor(timeToSeek),
                      progress: Math.floor(timeToSeek)
                    }, '*');
                  }
                  // VidFast player - try generic formats
                  else if (currentUrl.includes('vidfast.pro')) {
                    iframe.contentWindow?.postMessage({ 
                      type: 'seek', 
                      time: Math.floor(timeToSeek),
                      seconds: Math.floor(timeToSeek)
                    }, '*');
                  }
                  // Generic fallback - try multiple formats
                  else {
                    iframe.contentWindow?.postMessage({ 
                      type: 'seek', 
                      time: timeToSeek,
                      seconds: Math.floor(timeToSeek),
                      minutes: timeInMinutes,
                      timeString: `${timeInMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
                    }, '*');
                    
                    // Alternative formats
                    iframe.contentWindow?.postMessage({ action: 'seek', time: timeToSeek }, '*');
                    iframe.contentWindow?.postMessage({ command: 'seek', value: timeToSeek }, '*');
                    iframe.contentWindow?.postMessage({ method: 'seek', params: [timeToSeek] }, '*');
                  }
                }, 2000); // Wait 2 seconds for iframe to fully load
              }
              
              // No automatic button showing - only on errors or manual trigger
            }}
            onError={() => {
              // Clear any pending timeout
              if (iframeLoadTimeoutRef.current) {
                clearTimeout(iframeLoadTimeoutRef.current);
              }
              
              // Show proper error message and manual switch button on error
              console.log('⚠️ Iframe onError triggered - showing error message and switch button');
              setError(`Failed to load ${currentSource?.name}. Please try a different server.`);
              setLoading(false);
              setShowSwitchSourceButton(true);
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
        
        {/* Removed auto-switch notification - using simple arrow button instead */}

        {/* Server Selector - Always visible */}
        {streamingSources.length > 1 && (
          <div className="fixed top-4 right-2 sm:right-4 z-[9999] pointer-events-auto flex items-center gap-2">
            {/* Info Icon - Hidden on mobile */}
            <div className="relative hidden sm:block" data-server-info>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowServerInfo(!showServerInfo);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowServerInfo(!showServerInfo);
                }}
                className="bg-black/80 hover:bg-black/95 text-white p-1.5 sm:p-2 rounded-lg backdrop-blur-md border border-blue-500 shadow-2xl hover:shadow-blue-500/20 transition-all duration-200 hover:scale-105 touch-manipulation"
                title="Server Information"
              >
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {showServerInfo && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 bg-black/95 border border-blue-500 backdrop-blur-md rounded-lg shadow-2xl p-2 w-[240px] sm:w-[280px]">
                  <div className="text-white text-xs text-center">
                    <h4 className="font-semibold mb-1 text-blue-400 text-xs">Server Info</h4>
                    <p className="text-xs leading-relaxed whitespace-nowrap">
                      Try switching servers if one doesn't work.
                    </p>
                  </div>
                  {/* Arrow pointing up - centered */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/95"></div>
                </div>
              )}
            </div>

            {/* Server Dropdown */}
            <div className="relative" data-server-dropdown>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Server dropdown button clicked, current state:', showServerDropdown);
                  handleServerButtonClick();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Server dropdown button touch start');
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Server dropdown button touched, current state:', showServerDropdown);
                  handleServerButtonClick();
                }}
                className="bg-black/80 hover:bg-black/95 text-white p-1 sm:p-2 rounded-lg backdrop-blur-md border border-blue-500 shadow-2xl hover:shadow-blue-500/20 transition-all duration-200 hover:scale-105 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] sm:min-w-[140px] flex items-center justify-center gap-1 sm:gap-2 touch-manipulation"
              >
                <span className="text-sm sm:text-lg filter drop-shadow-[0_0_2px_rgba(59,130,246,0.8)]">☁️</span>
                <span className="text-xs sm:text-sm font-medium">
                  <span className="hidden sm:inline">Server: </span>{currentSourceIndex + 1}
                </span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showServerDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-black/90 border border-blue-500 backdrop-blur-md rounded-lg shadow-2xl min-w-[100px] sm:min-w-[140px] max-h-[200px] overflow-y-auto">
                  {streamingSources.map((source, index) => (
                      <button
                        key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        switchServerWithTimeline(index);
                        setShowServerDropdown(false);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`🔄 Server ${index + 1} selected via touch`);
                        switchServerWithTimeline(index);
                        setShowServerDropdown(false);
                      }}
                      className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition-colors touch-manipulation ${
                          index === currentSourceIndex
                          ? 'bg-blue-600/20 text-blue-300' 
                          : 'text-white hover:bg-blue-600/20 hover:text-blue-300'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === Math.min(streamingSources.length, 5) - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      <span className="text-sm sm:text-lg filter drop-shadow-[0_0_2px_rgba(59,130,246,0.8)]">☁️</span>
                      <span>Server {index + 1}</span>
                      </button>
                    ))}
                </div>
              )}
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  // Create a synthetic mouse event for compatibility
                  const syntheticEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                  } as React.MouseEvent;
                  handleSkipIntro(syntheticEvent);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:border-blue-500 touch-manipulation min-h-[44px]"
              >
                <SkipIntro className="w-4 h-4 text-blue-500" />
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  // Create a synthetic mouse event for compatibility
                  const syntheticEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                  } as React.MouseEvent;
                  handleNextEpisode(syntheticEvent);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:border-blue-500 touch-manipulation min-h-[44px]"
              >
                <NextEpisode className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Next Episode</span>
              </Button>
            )}
          </div>
        )}
        
        {/* Pause Screen Overlay with Logo */}
        {!isPlaying && currentSource?.type === 'hls' && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none">
            {/* Logo - Centered independently from left to right and top to bottom */}
            <div className="absolute inset-0 flex items-center justify-center -mt-10 sm:-mt-12 md:-mt-16">
              <img
                src="/logo.svg"
                alt="CINEMA.BZ"
                className="h-8 sm:h-10 md:h-12 lg:h-16 w-auto transition-all duration-300 filter brightness-110"
              />
            </div>

            {/* Movie Title - Centered independently from left to right, positioned below center */}
            <div className="absolute inset-0 flex items-center justify-center mt-10 sm:mt-12 md:mt-16">
              <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center px-4 w-full">{title}</h2>
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
                              <p className="text-blue-500 mb-4">{error}</p>
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
                <Button onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎬 Close button clicked in first error overlay');
                  // Capture final screenshot before closing
                  if (onProgressUpdate) {
                    // Use current server's playback time
                    const video = videoRef.current;
                    let finalTotalTime = 0;
                    
                    if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
                      finalTotalTime = video.currentTime;
                    } else if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
                      finalTotalTime = playerCurrentTime;
                    }
                    
                    console.log(`📊 Close: Using ${currentSource?.type} server time: ${finalTotalTime.toFixed(2)}s (${Math.floor(finalTotalTime/60)}:${Math.floor(finalTotalTime%60).toString().padStart(2, '0')})`);
                    
                    const duration = actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200);
                    console.log('🎬 Close button clicked - calling onProgressUpdate with total watch time');
                    console.log('🎬 Final total watch time:', finalTotalTime, 'Duration:', duration);
                    onProgressUpdate(finalTotalTime, duration, videoRef.current);
                  }
                  onClose();
                }} 
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎬 Close button touched in first error overlay (mobile)');
                  // Capture final screenshot before closing
                  if (onProgressUpdate) {
                    // Use current server's playback time
                    const video = videoRef.current;
                    let finalTotalTime = 0;
                    
                    if (currentSource?.type === 'hls' && video && !isNaN(video.currentTime) && video.currentTime > 0) {
                      finalTotalTime = video.currentTime;
                    } else if (currentSource?.type === 'iframe' && playerCurrentTime > 0) {
                      finalTotalTime = playerCurrentTime;
                    }
                    
                    console.log(`📊 Close: Using ${currentSource?.type} server time: ${finalTotalTime.toFixed(2)}s (${Math.floor(finalTotalTime/60)}:${Math.floor(finalTotalTime%60).toString().padStart(2, '0')})`);
                    
                    const duration = actualDuration || videoRef.current?.duration || (type === 'tv' ? 2700 : 7200);
                    console.log('🎬 Close button touched - calling onProgressUpdate with total watch time');
                    console.log('🎬 Final total watch time:', finalTotalTime, 'Duration:', duration);
                    onProgressUpdate(finalTotalTime, duration, videoRef.current);
                  }
                  onClose();
                }} 
                className="bg-blue-600 hover:bg-blue-700 touch-manipulation min-h-[44px] min-w-[44px]">
                  Close
              </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Universal Back Button - Always visible */}
        <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Universal back button clicked');
                handleBackButton();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Universal back button touch start');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Universal back button touched (mobile)');
                handleBackButton();
              }}
          className="absolute top-4 left-4 z-50 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white p-1.5 sm:p-2 rounded-lg transition-all duration-300 pointer-events-auto border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px]"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
            </button>

        {/* Controls Overlay */}
        {showControls && currentSource?.type === 'hls' && (
          <div 
            className={`controls-overlay absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none ${isFullscreen ? 'fullscreen-controls' : ''}`}
            style={{ pointerEvents: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Movie Title - Static (Mobile) */}
            <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none h-[44px] flex items-center md:hidden px-16">
              <h1 className="text-white text-sm font-bold whitespace-nowrap drop-shadow-lg text-center w-full truncate">
                {title}
                {type === 'tv' && season && episode && (
                  <span className="text-gray-300 text-xs ml-1">S{season}E{episode}</span>
                )}
              </h1>
            </div>
            
            {/* Movie Title - Static (Desktop Only) */}
            <div className="absolute top-4 left-0 right-0 z-10 pointer-events-none h-[44px] flex items-center justify-center hidden md:flex">
              <h1 className="text-white text-lg md:text-xl font-bold whitespace-nowrap drop-shadow-lg px-4 text-center">
                {title}
                {type === 'tv' && season && episode && (
                  <span className="text-gray-300 text-base md:text-lg ml-2">S{season}E{episode}</span>
                )}
              </h1>
            </div>
              
            {/* Top Right Controls */}
                <div 
              className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
            >
              {/* Landscape Mode Indicator */}
              {isFullscreen && isLandscape && (
                <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <span>🌐</span>
                  <span>Landscape</span>
                </div>
              )}
                </div>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
              {/* Progress Bar */}
              <div className="mb-4 relative">
                                 <div 
                   className={`progress-bar-container relative w-full h-2 bg-gray-600 rounded-lg overflow-hidden cursor-pointer ${isFullscreen ? 'fullscreen-progress-bar' : ''}`}
                   onMouseEnter={handleProgressBarHover}
                   onMouseMove={handleProgressBarMove}
                   onMouseLeave={handleProgressBarLeave}
                   onTouchStart={handleProgressBarTouchStart}
                   onTouchMove={handleProgressBarTouchMove}
                   onTouchEnd={handleProgressBarTouchEnd}
                 >
                  {/* Background track */}
                  <div className="absolute inset-0 bg-gray-700 rounded-lg"></div>
                  
                  {/* Gradient progress fill */}
                  <div 
                    className="absolute left-0 top-0 h-full gradient-progress-bar rounded-lg transition-all duration-200"
                    style={{ width: `${duration > 0 && currentTime >= 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }}
                  ></div>
                  
                  {/* Hover indicator */}
                  {showPreview && previewTime !== null && (
                    <div 
                      className="absolute top-0 h-full w-1 bg-blue-500 rounded-full shadow-lg pointer-events-none z-10 transition-all duration-150 ease-out"
                      style={{ 
                        left: `${(previewTime / (duration || 1)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    ></div>
                  )}
                  
                  {/* Clickable overlay for precise seeking */}
                  <div
                    className="absolute inset-0 w-full h-full cursor-pointer"
                    onClick={(e) => {
                    e.stopPropagation();
                      handleProgressBarClick(e);
                  }}
                     onMouseMove={handleRangeInputMouseMove}
                     onMouseLeave={handleRangeInputMouseLeave}
                     onTouchStart={handleRangeInputTouchStart}
                     onTouchMove={handleRangeInputTouchMove}
                     onTouchEnd={handleRangeInputTouchEnd}
                />
                </div>
                
                {/* Timestamp preview tooltip - positioned outside progress bar */}
                {showPreview && previewTime !== null && (
                  <div 
                    className="absolute bottom-full bg-black/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-bold pointer-events-none z-[99999] border border-blue-500 shadow-2xl transition-all duration-75 ease-out"
                    style={{ 
                      left: `${Math.max(0, Math.min(100, (previewTime / (duration || 1)) * 100))}%`,
                      transform: 'translateX(-50%) translateY(-8px)',
                      position: 'absolute',
                      willChange: 'transform, left',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-white font-mono">{formatTime(previewTime)}</span>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
                  </div>
                )}
                
                <div className="flex justify-between text-sm text-gray-300 mt-1">
                  <span>{formatTime(currentTime || 0)}</span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipBackward();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      skipBackward();
                    }}
                    className="text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px]"
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
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      togglePlayPause();
                    }}
                    disabled={isPlayPausePending}
                    className={`text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px] ${isPlayPausePending ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      skipForward();
                    }}
                    className="text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px]"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  
                  <div 
                    className="flex items-center gap-0.5 sm:gap-2"
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
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleMute();
                      }}
                      className="text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px]"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div 
                      className={`relative w-20 h-2 hidden sm:block ${isFullscreen ? 'fullscreen-volume-container' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                    >
                      {/* Background track */}
                      <div className="absolute inset-0 bg-gray-700 rounded-lg"></div>
                      
                      {/* Gradient progress fill */}
                      <div 
                        className={`absolute left-0 top-0 h-full gradient-progress-bar rounded-lg transition-all duration-200 ${isFullscreen ? 'fullscreen-volume-bar' : ''}`}
                        style={{ width: `${(volume * 100)}%` }}
                      ></div>
                      
                      {/* Invisible range input for interaction */}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      className={`w-full h-full absolute inset-0 opacity-0 cursor-pointer ${isFullscreen ? 'fullscreen-volume-slider' : ''}`}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleVolumeChange(e);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                    />
                  </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-4">
                  {/* Speed Display */}
                  <div className="text-white text-sm bg-black/50 px-1.5 sm:px-2 py-1 rounded">
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
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowSettingsMenu(!showSettingsMenu);
                    }}
                    className="settings-button text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px]"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFullscreen();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFullscreen();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFullscreen();
                  }}
                  className={`text-white hover:bg-white/20 touch-manipulation min-h-[44px] min-w-[44px] active:bg-white/30 ${isMobile ? 'bg-black/20 border border-white/20 rounded-lg shadow-lg backdrop-blur-sm transform transition-transform active:scale-95 select-none' : ''}`}
                  title={isFullscreen ? (isLandscape ? 'Exit Fullscreen (Landscape)' : 'Exit Fullscreen') : (isMobile ? 'Enter Fullscreen (Mobile)' : 'Enter Fullscreen (Auto Landscape)')}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
                </div>
              </div>
            </div>
              </div>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎬 Close button clicked in error overlay');
                    onClose();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎬 Close button touched in error overlay (mobile)');
                    onClose();
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 touch-manipulation min-h-[44px] min-w-[44px]"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Galaxy Z Fold and large screen optimizations */
          @media (min-width: 768px) and (max-width: 1024px) {
            .controls-overlay .flex-wrap {
              flex-wrap: nowrap !important;
            }
            .controls-overlay .gap-1 {
              gap: 0.5rem !important;
            }
            .controls-overlay .gap-2 {
              gap: 0.75rem !important;
            }
            .controls-overlay .gap-4 {
              gap: 1rem !important;
            }
          }
          
          /* Fullscreen controls optimization */
          .fullscreen-controls .flex-wrap {
            flex-wrap: nowrap !important;
          }
          .fullscreen-controls .gap-1 {
            gap: 0.25rem !important;
          }
          .fullscreen-controls .gap-2 {
            gap: 0.5rem !important;
          }
          .fullscreen-controls .gap-4 {
            gap: 0.75rem !important;
          }
        `
      }} />
    </div>
  );
};

export default VideoPlayer; 