import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import api from '@/services/api';

const MoviePlayer: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { getHistoryItem, updateProgress } = useWatchHistory();
  const [movieData, setMovieData] = useState<any>(null);
  
  const tmdbId = parseInt(id || '0');
  const title = searchParams.get('title') || 'Movie';
  const initialTime = parseFloat(searchParams.get('time') || '0');
  
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
      onProgressUpdate={(currentTime, duration, videoElement) => {
        // Use fetched movie data for proper progress tracking
        if (movieData) {
          updateProgress(movieData, currentTime, duration, 'movie', undefined, undefined, undefined, videoElement);
        }
      }}
    />
  );
};

export default MoviePlayer; 