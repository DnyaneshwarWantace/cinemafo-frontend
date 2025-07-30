import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import api from '@/services/api';

const MoviePlayer: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getHistoryItem, updateProgress } = useWatchHistory();
  const [movieData, setMovieData] = useState<any>(null);
  
  const tmdbId = parseInt(id || '0');
  const title = searchParams.get('title') || 'Movie';
  const initialTime = parseFloat(searchParams.get('time') || '0');
  const fromPage = searchParams.get('from') || '/';

  console.log('🎬 MoviePlayer initialized:', { tmdbId, title, initialTime, fromPage });

  const handleClose = () => {
    console.log('🎬 MoviePlayer: Closing, navigating to:', fromPage);
    navigate(fromPage);
  };
  
  // Get saved progress for this movie
  const historyItem = getHistoryItem(tmdbId, 'movie');
  const savedTime = historyItem?.currentTime || initialTime;

  // Fetch movie data for proper progress tracking
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const response = await api.getMovieDetails(tmdbId);
        setMovieData(response.data);
      } catch (error) {
        console.error('Failed to fetch movie data:', error);
        // Use fallback data
        setMovieData({
          id: tmdbId,
          title: title,
          name: title,
          release_date: '2024-01-01',
          first_air_date: '2024-01-01',
          media_type: 'movie',
          poster_path: '',
          backdrop_path: '',
          overview: '',
          vote_average: 0,
          vote_count: 0,
          genres: []
        });
      }
    };
    
    fetchMovieData();
  }, [tmdbId, title]);



  return (
    <VideoPlayer
      tmdbId={tmdbId}
      type="movie"
      title={title}
      initialTime={savedTime}
      onClose={handleClose}
      onProgressUpdate={(currentTime, duration, videoElement) => {
        // Use fetched movie data for proper progress tracking, or fallback data
        const dataToUse = movieData || {
          id: tmdbId,
          title: title,
          name: title,
          media_type: 'movie' as const,
          poster_path: '',
          backdrop_path: '',
          overview: '',
          vote_average: 0,
          vote_count: 0
        };
        
        console.log('🎬 MoviePlayer: Updating progress for:', dataToUse.title, 'Time:', currentTime);
        updateProgress(dataToUse, currentTime, duration, 'movie', undefined, undefined, undefined, videoElement);
      }}
    />
  );
};

export default MoviePlayer; 