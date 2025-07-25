import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import api from '@/services/api';

const TVShowPlayerPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { getHistoryItem, updateProgress } = useWatchHistory();
  const [showData, setShowData] = useState<any>(null);
  
  const tmdbId = parseInt(id || '0');
  const season = parseInt(searchParams.get('season') || '1');
  const episode = parseInt(searchParams.get('episode') || '1');
  const title = searchParams.get('title') || 'TV Show';
  const initialTime = parseFloat(searchParams.get('time') || '0');
  
  // Get saved progress for this episode
  const historyItem = getHistoryItem(tmdbId, 'tv', season, episode);
  const savedTime = historyItem?.currentTime || initialTime;

  // Fetch show data for proper progress tracking
  useEffect(() => {
    const fetchShowData = async () => {
      try {
        const response = await api.getShowDetails(tmdbId);
        setShowData(response.data);
      } catch (error) {
        console.error('Failed to fetch show data:', error);
        // Use fallback data
        setShowData({
          id: tmdbId,
          title: title,
          name: title,
          release_date: '2024-01-01',
          first_air_date: '2024-01-01',
          media_type: 'tv',
          poster_path: '',
          backdrop_path: '',
          overview: '',
          vote_average: 0,
          vote_count: 0,
          genres: []
        });
      }
    };
    
    fetchShowData();
  }, [tmdbId, title]);



  return (
    <VideoPlayer
      tmdbId={tmdbId}
      type="tv"
      season={season}
      episode={episode}
      title={`${title} - S${season}E${episode}`}
      initialTime={savedTime}
      onProgressUpdate={(currentTime, duration, videoElement) => {
        // Use fetched show data for proper progress tracking
        if (showData) {
          updateProgress(showData, currentTime, duration, 'tv', season, episode, undefined, videoElement);
        }
      }}
    />
  );
};

export default TVShowPlayerPage; 