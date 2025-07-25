import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import api, { Movie, TVShow } from '@/services/api';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface VideoPlayerPageProps {
  type: 'movie' | 'tv';
}

const VideoPlayerPage: React.FC<VideoPlayerPageProps> = ({ type }) => {
  const { id, season, episode } = useParams<{
    id: string;
    season?: string;
    episode?: string;
  }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getHistoryItem, updateProgress } = useWatchHistory();

  const tmdbId = parseInt(id || '0');
  const seasonNumber = season ? parseInt(season) : 1;
  const episodeNumber = episode ? parseInt(episode) : 1;

  useEffect(() => {
    const fetchContent = async () => {
      if (!tmdbId) {
        setError('Invalid content ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let contentData;
        if (type === 'movie') {
          const response = await api.getMovieDetails(tmdbId);
          contentData = response.data;
        } else {
          const response = await api.getShowDetails(tmdbId);
          contentData = response.data;
        }

        setContent(contentData);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [tmdbId, type]);

  const handleClose = () => {
    // Navigate back to the previous page or home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleNextEpisode = () => {
    if (type === 'tv' && content) {
      // Navigate to next episode
      const nextEpisode = episodeNumber + 1;
      navigate(`/watch/tv/${tmdbId}/${seasonNumber}/${nextEpisode}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">{error || 'Content not found'}</p>
          <button
            onClick={handleClose}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    if (type === 'movie') {
      return content.title || content.name;
    } else {
      return `${content.name} - S${seasonNumber}E${episodeNumber}`;
    }
  };

  const getInitialTime = () => {
    if (type === 'movie') {
      return getHistoryItem(tmdbId, 'movie')?.currentTime || 0;
    } else {
      return getHistoryItem(tmdbId, 'tv', seasonNumber, episodeNumber)?.currentTime || 0;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <VideoPlayer
        tmdbId={tmdbId}
        type={type}
        season={type === 'tv' ? seasonNumber : undefined}
        episode={type === 'tv' ? episodeNumber : undefined}
        title={getTitle()}
        onClose={handleClose}
        onNextEpisode={type === 'tv' ? handleNextEpisode : undefined}
        onProgressUpdate={(currentTime, duration, videoElement) => {
          if (type === 'movie') {
            updateProgress(content, currentTime, duration, 'movie', undefined, undefined, undefined, videoElement);
          } else {
            updateProgress(content, currentTime, duration, 'tv', seasonNumber, episodeNumber, undefined, videoElement);
          }
        }}
        initialTime={getInitialTime()}
      />
    </div>
  );
};

export default VideoPlayerPage; 