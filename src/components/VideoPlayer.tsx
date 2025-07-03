import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2, Volume2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoPlayerProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
  onClose: () => void;
}

interface AudioTrack {
  id: string;
  groupId: string;
  name: string;
  language: string;
  default?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ tmdbId, type, season, episode, title, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string>('');

  // Construct HLS URL based on content type
  const getHlsUrl = () => {
    let url;
    if (type === 'movie') {
      url = `https://mia.vidjoy.wtf/movies/${tmdbId}/index.m3u8`;
    } else {
      url = `https://mia.vidjoy.wtf/tv/${tmdbId}/${season}/${episode}/index.m3u8`;
    }
    console.log(`VideoPlayer constructing URL: ${url} (type: ${type}, tmdbId: ${tmdbId}, season: ${season}, episode: ${episode})`);
    return url;
  };

  // Construct iframe fallback URL
  const getIframeUrl = () => {
    if (type === 'movie') {
      return `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`;
    } else {
      return `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
    }
  };

  // Handle audio track change
  const handleAudioTrackChange = (trackId: string) => {
    if (hlsRef.current) {
      const trackIndex = audioTracks.findIndex(track => track.id === trackId);
      if (trackIndex !== -1) {
        hlsRef.current.audioTrack = trackIndex;
        setCurrentAudioTrack(trackId);
      }
    }
  };

  // Initialize HLS playback
  useEffect(() => {
    const initializePlayer = async () => {
      setLoading(true);
      setError(null);
      setAudioTracks([]);
      setCurrentAudioTrack('');

      if (!videoRef.current) return;

      // Clean up any existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Stop any existing video playback
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.src = '';
        videoRef.current.load();
      }

      try {
        const hlsUrl = getHlsUrl();
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            debug: false
          });

          hlsRef.current = hls;
          hls.attachMedia(videoRef.current);
          
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('HLS: Media attached');
            hls.loadSource(hlsUrl);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('HLS: Manifest parsed, playback should begin');
            videoRef.current?.play().catch(console.error);
            setLoading(false);

            // Get available audio tracks
            if (hls.audioTracks.length > 0) {
              const tracks: AudioTrack[] = hls.audioTracks.map(track => ({
                id: track.id.toString(),
                groupId: track.groupId,
                name: track.name,
                language: track.lang || 'unknown',
                default: track.default
              }));
              setAudioTracks(tracks);
              const defaultTrack = tracks.find(track => track.default);
              if (defaultTrack) {
                setCurrentAudioTrack(defaultTrack.id);
              } else if (tracks.length > 0) {
                setCurrentAudioTrack(tracks[0].id);
              }
            }
          });

          // Handle seeking to prevent audio overlap
          videoRef.current.addEventListener('seeking', () => {
            if (videoRef.current) {
              videoRef.current.muted = true;
            }
          });

          videoRef.current.addEventListener('seeked', () => {
            if (videoRef.current) {
              videoRef.current.muted = false;
            }
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('HLS: Fatal network error', data);
                  setError('Network error occurred. Switching to alternative player...');
                  setUseIframeFallback(true);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('HLS: Fatal media error', data);
                  setError('Media playback error. Switching to alternative player...');
                  setUseIframeFallback(true);
                  break;
                default:
                  console.error('HLS: Fatal error', data);
                  setError('Playback error. Switching to alternative player...');
                  setUseIframeFallback(true);
                  break;
              }
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // For Safari - native HLS support
          videoRef.current.src = hlsUrl;
          
          // Handle seeking to prevent audio overlap
          videoRef.current.addEventListener('seeking', () => {
            if (videoRef.current) {
              videoRef.current.muted = true;
            }
          });

          videoRef.current.addEventListener('seeked', () => {
            if (videoRef.current) {
              videoRef.current.muted = false;
            }
          });

          videoRef.current.addEventListener('loadedmetadata', () => {
            videoRef.current?.play().catch(console.error);
            setLoading(false);
          });

          videoRef.current.addEventListener('error', () => {
            setError('Playback error. Switching to alternative player...');
            setUseIframeFallback(true);
          });
        } else {
          console.warn('HLS not supported, falling back to iframe');
          setUseIframeFallback(true);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        setError('Failed to initialize player. Switching to alternative player...');
        setUseIframeFallback(true);
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.src = '';
        videoRef.current.load();
        
        // Remove event listeners
        videoRef.current.removeEventListener('seeking', () => {});
        videoRef.current.removeEventListener('seeked', () => {});
        videoRef.current.removeEventListener('loadedmetadata', () => {});
        videoRef.current.removeEventListener('error', () => {});
      }
    };
  }, [tmdbId, type, season, episode]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-[110] bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-200 shadow-2xl backdrop-blur-sm"
        aria-label="Close player"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Audio Track Selector */}
      {!useIframeFallback && audioTracks.length > 0 && (
        <div className="absolute top-6 left-6 z-[110]">
          <div className="flex items-center gap-2 bg-black/70 p-2 rounded-lg backdrop-blur-sm">
            <Volume2 className="w-5 h-5 text-white" />
            <Select value={currentAudioTrack} onValueChange={handleAudioTrackChange}>
              <SelectTrigger className="w-[180px] bg-transparent border-none text-white">
                <SelectValue placeholder="Select Audio Track" />
              </SelectTrigger>
              <SelectContent>
                {audioTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name} ({track.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="w-full h-full flex items-center justify-center">
        {useIframeFallback ? (
          // Iframe Fallback Player
          <iframe
            src={getIframeUrl()}
            className="w-full h-full bg-black"
            style={{ 
              minWidth: '100vw',
              minHeight: '100vh',
              border: 'none'
            }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={title}
          />
        ) : (
          // HLS Video Player
          <>
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              playsInline
              autoPlay
            />
          </>
        )}
      </div>

      {/* Video Info Overlay */}
      <div className="absolute bottom-6 left-6 text-white z-[110] bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-gray-300 text-sm">
          {useIframeFallback ? 'Alternative Player' : 'Direct Stream'}
        </p>
      </div>
    </div>
  );
};

export default VideoPlayer; 