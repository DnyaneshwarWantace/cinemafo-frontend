import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Languages, SkipForward, SkipBack, ArrowLeft, Zap, RefreshCw, SkipForward as NextEpisode, Zap as SkipIntro } from 'lucide-react';
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
  const onClose = propOnClose || (() => navigate(-1));

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
          } catch (err) {
            console.error('Failed to fetch movie details for progress update:', err);
            return;
          }
        } else if (type === 'tv') {
          try {
            const response = await api.getShowDetails(tmdbId);
            content = response.data;
          } catch (err) {
            console.error('Failed to fetch show details for progress update:', err);
            return;
          }
        }
        
        if (content) {
          updateProgress(
            content,
            currentTime,
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
  const [bufferStallCount, setBufferStallCount] = useState(0);
  const bufferStallTimeoutRef = useRef<NodeJS.Timeout>();
  const [showSourceSwitchNotification, setShowSourceSwitchNotification] = useState(false);
  const sourceSwitchTimeoutRef = useRef<NodeJS.Timeout>();
  const [isMobile, setIsMobile] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const iframeLoadTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Timestamp preview state
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
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
              url: `https://player.vidzee.wtf/embed/movie/4k/${tmdbId}`,
              name: 'VidZee 4K (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://mappletv.uk/watch/movie/${tmdbId}`,
              name: 'MappleTV (Fallback)',
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
              url: `https://vidsrc.wtf/embed/movie/${tmdbId}`,
              name: 'VidSrc WTF (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidjoy.pro/embed/movie/${tmdbId}`,
              name: 'VidJoy (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
              name: 'VidSrc XYZ (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidora.su/movie/${tmdbId}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
              name: 'Vidora (Last Fallback)',
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
              url: `https://mappletv.uk/watch/tv/${tmdbId}-${season}-${episode}`,
              name: 'MappleTV (Fallback)',
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
              url: `https://vidsrc.wtf/embed/tv/${tmdbId}/${season}/${episode}`,
              name: 'VidSrc WTF (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidjoy.pro/embed/tv/${tmdbId}/${season}/${episode}`,
              name: 'VidJoy (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`,
              name: 'VidSrc XYZ (Fallback)',
              language: 'multi'
            },
            {
              type: 'iframe',
              url: `https://vidora.su/tv/${tmdbId}/${season}/${episode}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
              name: 'Vidora (Last Fallback)',
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
            url: `https://player.vidzee.wtf/embed/movie/4k/${tmdbId}`,
            name: 'VidZee 4K - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://mappletv.uk/watch/movie/${tmdbId}`,
            name: 'MappleTV - Fallback',
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
          },
          {
            type: 'iframe',
            url: `https://vidsrc.wtf/embed/movie/${tmdbId}`,
            name: 'VidSrc WTF - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidjoy.pro/embed/movie/${tmdbId}`,
            name: 'VidJoy - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
            name: 'VidSrc XYZ - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidora.su/movie/${tmdbId}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
            name: 'Vidora - Last Fallback',
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
            url: `https://mappletv.uk/watch/tv/${tmdbId}-${seasonNum}-${episodeNum}`,
            name: 'MappleTV - Fallback',
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
          },
          {
            type: 'iframe',
            url: `https://vidsrc.wtf/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidSrc WTF - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidjoy.pro/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidJoy - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${seasonNum}&episode=${episodeNum}`,
            name: 'VidSrc XYZ - Fallback',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidora.su/tv/${tmdbId}/${seasonNum}/${episodeNum}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
            name: 'Vidora - Last Fallback',
            language: 'multi'
          }
        );
      }

      if (fallbackSources.length > 0) {
        console.log('🔄 Using fallback sources after API timeout:', fallbackSources);
        
        // Show notification for automatic fallback to secondary source
        setShowSourceSwitchNotification(true);
        
        // Auto-hide notification after 5 seconds (increased from 3)
        if (sourceSwitchTimeoutRef.current) {
          clearTimeout(sourceSwitchTimeoutRef.current);
        }
        sourceSwitchTimeoutRef.current = setTimeout(() => {
          setShowSourceSwitchNotification(false);
        }, 5000);
        
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
            url: `https://player.vidzee.wtf/embed/movie/4k/${tmdbId}`,
            name: 'VidZee 4K',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://mappletv.uk/watch/movie/${tmdbId}`,
            name: 'MappleTV',
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
          },
          {
            type: 'iframe',
            url: `https://vidsrc.wtf/embed/movie/${tmdbId}`,
            name: 'VidSrc WTF',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidjoy.pro/embed/movie/${tmdbId}`,
            name: 'VidJoy',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
            name: 'VidSrc XYZ',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidora.su/movie/${tmdbId}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
            name: 'Vidora',
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
            url: `https://mappletv.uk/watch/tv/${tmdbId}-${seasonNum}-${episodeNum}`,
            name: 'MappleTV',
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
          },
          {
            type: 'iframe',
            url: `https://vidsrc.wtf/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidSrc WTF',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidjoy.pro/embed/tv/${tmdbId}/${seasonNum}/${episodeNum}`,
            name: 'VidJoy',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${seasonNum}&episode=${episodeNum}`,
            name: 'VidSrc XYZ',
            language: 'multi'
          },
          {
            type: 'iframe',
            url: `https://vidora.su/tv/${tmdbId}/${seasonNum}/${episodeNum}?autoplay=true&colour=00ff9d&backbutton=https://vidora.su/&logo=https://vidora.su/logo.png`,
            name: 'Vidora',
            language: 'multi'
          }
        );
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
    if (nextIndex < streamingSources.length) {
      console.log(`🔄 Switching from source ${currentSourceIndex} to ${nextIndex}: ${streamingSources[nextIndex].name}`);
      
      // Show notification for source switch
      setShowSourceSwitchNotification(true);
      
      // Auto-hide notification after 3 seconds
      if (sourceSwitchTimeoutRef.current) {
        clearTimeout(sourceSwitchTimeoutRef.current);
      }
      sourceSwitchTimeoutRef.current = setTimeout(() => {
        setShowSourceSwitchNotification(false);
      }, 3000);
      
      setCurrentSourceIndex(nextIndex);
      setCurrentSource(streamingSources[nextIndex]);
      setError(null);
      setLoading(true);
    } else {
      console.log('❌ No more fallback sources available');
      setError('This content is not available on any streaming service at the moment. Please try again later or check back soon.');
      setLoading(false);
    }
  }, [currentSourceIndex, streamingSources]);

  // Enhanced error handling for iframe fallback and TCF suppression
  useEffect(() => {
    const originalError = console.error;
    let serverErrorCount = 0;
    let lastErrorTime = 0;

    console.error = (...args) => {
      const message = args[0]?.toString() || '';

      // Suppress LT.JS TCF errors
      if (message.includes('TCF IFRAME LOCATOR API') || message.includes('__tcfapiLocator')) {
        return;
      }

      // Detect repeated server 404 errors from iframe sources
      if (message.includes('Fetch Error') && message.includes('Server') && message.includes('404')) {
        const currentTime = Date.now();

        // If multiple server errors occur within 3 seconds, switch source
        if (currentTime - lastErrorTime < 3000) {
          serverErrorCount++;
        } else {
          serverErrorCount = 1;
        }
        lastErrorTime = currentTime;

        // If we get 3+ server errors quickly, switch to next source
        if (serverErrorCount >= 3 && currentSource?.type === 'iframe') {
          console.log('🔄 Multiple server errors detected, switching source...');
          setTimeout(() => switchToNextSource(), 500);
          serverErrorCount = 0; // Reset counter
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
      if (iframeLoadTimeoutRef.current) {
        clearTimeout(iframeLoadTimeoutRef.current);
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
    // Fix: Use a more reliable skip time calculation
    const skipToTime = Math.min(video.currentTime + skipIntroTimeRemaining, video.duration - 1);
    
    // Ensure we don't skip beyond the video duration
    if (skipToTime < video.duration) {
    video.currentTime = skipToTime;
    }
    setShowSkipIntro(false);
  }, [skipIntroTimeRemaining]);

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
    
    // Set timeout for iframe loading (15 seconds)
    if (currentSource?.type === 'iframe') {
      console.log('⏱️ Setting iframe load timeout for:', currentSource.name);
      
      // Clear any existing iframe timeout
      if (iframeLoadTimeoutRef.current) {
        clearTimeout(iframeLoadTimeoutRef.current);
      }
      
      // Set new timeout (reduced to 5 seconds for faster fallback)
      iframeLoadTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Iframe load timeout reached for:', currentSource.name);
        switchToNextSource();
      }, 5000); // 5 second timeout for faster fallback
    }
  }, [currentSource?.url, currentSource?.type, currentSource?.name, switchToNextSource]);

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
    
    // Only focus the container for keyboard events - no play/pause toggle
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
      
      video.addEventListener('play', () => {
        setIsPlaying(true);
        // Initial progress update when video starts playing
        if (onProgressUpdate && video.duration > 0) {
          console.log('🎬 Initial progress update on play start');
          onProgressUpdate(video.currentTime, video.duration);
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

  const handleProgressBarLeave = useCallback(() => {
    setShowPreview(false);
    setPreviewTime(null);
  }, []);

  // Enhanced mouse move handler for the range input
  const handleRangeInputMouseMove = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
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
  const handleProgressBarTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
    
    // Prevent default to avoid scrolling
    e.preventDefault();
  }, [duration]);

  const handleProgressBarTouchEnd = useCallback(() => {
    // Keep preview visible for a moment on mobile
    setTimeout(() => {
      setShowPreview(false);
      setPreviewTime(null);
    }, 1000);
  }, []);

  const handleRangeInputTouchMove = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, touchX / rect.width));
    const previewTimeValue = percentage * duration;
    
    setPreviewTime(previewTimeValue);
    setShowPreview(true);
    
    // Prevent default to avoid scrolling
    e.preventDefault();
  }, [duration]);

  const handleRangeInputTouchEnd = useCallback(() => {
    // Keep preview visible for a moment on mobile
    setTimeout(() => {
      setShowPreview(false);
      setPreviewTime(null);
    }, 1000);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
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
                {playbackSpeed === speed && <span className="text-blue-400">✓</span>}
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
                {selectedAudioTrack === track.id && <span className="text-blue-400 flex-shrink-0">✓</span>}
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
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onTouchStart={(e) => {
          if (isMobile) {
            e.preventDefault();
            setShowControls(true);
            // Only show controls on touch - no play/pause toggle
          }
        }}
        onTouchEnd={(e) => {
          if (isMobile) {
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
            src={currentSource?.url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            onLoad={() => {
              console.log('✅ Iframe loaded successfully:', currentSource?.name);
              setLoading(false);
              setError(null);

              // Clear any pending timeout
              if (iframeLoadTimeoutRef.current) {
                clearTimeout(iframeLoadTimeoutRef.current);
              }

              // Set a secondary timeout to check if iframe content is working
              // If we still see server errors after iframe loads, switch source
              iframeLoadTimeoutRef.current = setTimeout(() => {
                console.log('⏰ Iframe loaded but may not be working, checking for fallback...');
                // This will be caught by the error detection above if server errors persist
              }, 8000); // Wait 8 seconds after iframe loads
            }}
            onError={() => {
              console.error('❌ Iframe failed to load:', currentSource?.name);
              
              // Clear any pending timeout
              if (iframeLoadTimeoutRef.current) {
                clearTimeout(iframeLoadTimeoutRef.current);
              }
              
              // Switch to next source after a short delay
              setTimeout(() => {
                switchToNextSource();
              }, 1000);
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
              <div className="flex items-center gap-3 bg-black/90 backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-blue-400/50 shadow-lg shadow-blue-500/30 max-w-md text-center">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium block">Switching source</span>
                  <span className="text-xs text-gray-300">Loading alternative player...</span>
                </div>
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Create a synthetic mouse event for compatibility
                  const syntheticEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                  } as React.MouseEvent;
                  handleSkipIntro(syntheticEvent);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-blue-400/50 shadow-lg shadow-blue-500/30 hover:shadow-blue-400/50 hover:border-blue-300/70 touch-manipulation min-h-[44px]"
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
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Create a synthetic mouse event for compatibility
                  const syntheticEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                  } as React.MouseEvent;
                  handleNextEpisode(syntheticEvent);
                }}
                className="bg-black/80 hover:bg-black/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 backdrop-blur-sm border border-white/20 touch-manipulation min-h-[44px]"
              >
                <NextEpisode className="w-4 h-4" />
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
                alt="CINEMA.FO"
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
                <Button onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎬 Close button clicked in first error overlay');
                  // Capture final screenshot before closing
                  if (videoRef.current && onProgressUpdate) {
                    const currentTime = videoRef.current.currentTime;
                    const duration = videoRef.current.duration;
                    console.log('🎬 Close button clicked - calling onProgressUpdate with video element');
                    console.log('🎬 Current time:', currentTime, 'Duration:', duration);
                    onProgressUpdate(currentTime, duration, videoRef.current);
                  }
                  onClose();
                }} 
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎬 Close button touched in first error overlay (mobile)');
                  // Capture final screenshot before closing
                  if (videoRef.current && onProgressUpdate) {
                    const currentTime = videoRef.current.currentTime;
                    const duration = videoRef.current.duration;
                    console.log('🎬 Close button touched - calling onProgressUpdate with video element');
                    console.log('🎬 Current time:', currentTime, 'Duration:', duration);
                    onProgressUpdate(currentTime, duration, videoRef.current);
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
        
        {/* Controls Overlay */}
        {showControls && currentSource?.type === 'hls' && (
          <div 
            className={`controls-overlay absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none ${isFullscreen ? 'fullscreen-controls' : ''}`}
            style={{ pointerEvents: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Back Button - Top Left */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Back button clicked');
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
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Back button touched (mobile)');
                // Capture final screenshot before closing
                if (videoRef.current && onProgressUpdate) {
                  const currentTime = videoRef.current.currentTime;
                  const duration = videoRef.current.duration;
                  console.log('🎬 Back button touched - calling onProgressUpdate with video element');
                  console.log('🎬 Current time:', currentTime, 'Duration:', duration);
                  onProgressUpdate(currentTime, duration, videoRef.current);
                }
                onClose();
              }}
              className="absolute top-4 left-4 z-50 flex items-center justify-center bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-all duration-300 pointer-events-auto border border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 touch-manipulation min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Movie Title - Top Center */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 text-center pointer-events-auto max-w-[calc(100vw-120px)] px-2">
                <h1 className="text-white text-sm sm:text-lg md:text-xl font-bold truncate">
                  {title}
                  {type === 'tv' && season && episode && (
                    <span className="text-gray-300 text-xs sm:text-base md:text-lg ml-1 sm:ml-2">S{season}E{episode}</span>
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
              <div className="mb-4">
                                 <div 
                   className={`progress-bar-container relative w-full h-2 bg-gray-600 rounded-lg overflow-hidden cursor-pointer ${isFullscreen ? 'fullscreen-progress-bar' : ''}`}
                   onMouseMove={handleProgressBarHover}
                   onMouseLeave={handleProgressBarLeave}
                   onTouchMove={handleProgressBarTouchMove}
                   onTouchEnd={handleProgressBarTouchEnd}
                 >
                  {/* Background track */}
                  <div className="absolute inset-0 bg-gray-700 rounded-lg"></div>
                  
                  {/* Gradient progress fill */}
                  <div 
                    className="absolute left-0 top-0 h-full gradient-progress-bar rounded-lg transition-all duration-200"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  ></div>
                  
                  {/* Hover indicator */}
                  {showPreview && previewTime !== null && (
                    <div 
                      className="absolute top-0 h-full w-1 bg-blue-400 rounded-full shadow-lg pointer-events-none z-10 transition-all duration-150 ease-out"
                      style={{ 
                        left: `${(previewTime / (duration || 1)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                    ></div>
                  )}
                  
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
                     onMouseMove={handleRangeInputMouseMove}
                     onMouseLeave={handleRangeInputMouseLeave}
                     onTouchMove={handleRangeInputTouchMove}
                     onTouchEnd={handleRangeInputTouchEnd}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                </div>
                <div className="flex justify-between text-sm text-gray-300 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                
                {/* Timestamp preview tooltip - positioned outside progress bar */}
                {showPreview && previewTime !== null && (
                  <div 
                    className={`absolute bottom-full left-0 transform -translate-y-2 bg-black/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-bold pointer-events-none z-[99999] border border-blue-400/50 shadow-2xl transition-all duration-150 ease-out ${isFullscreen ? 'fullscreen-tooltip' : ''}`}
                    style={{ 
                      left: `${(previewTime / (duration || 1)) * 100}%`,
                      transform: 'translateX(-50%) translateY(-8px)',
                      position: 'absolute'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-white font-mono">{formatTime(previewTime)}</span>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-4 flex-wrap">
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
                
                <div className="flex items-center gap-1 sm:gap-4 flex-wrap">
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
        
        {/* Iframe Close Button */}
        {currentSource?.type === 'iframe' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎬 Iframe close button clicked');
              onClose();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎬 Iframe close button touched (mobile)');
              onClose();
            }}
            className="absolute top-4 right-4 z-10 text-white bg-black/60 hover:bg-black/80 touch-manipulation min-h-[44px] min-w-[44px]"
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

      {/* Custom Styles are handled via global CSS */}
    </div>
  );
};

export default VideoPlayer; 