import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import VideoPlayer from '@/components/VideoPlayer';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import api from '@/services/api';

const TVShowPlayerPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getHistoryItem, updateProgress } = useWatchHistory();
  const [showData, setShowData] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [originalPage, setOriginalPage] = useState<string>('/');
  
  const tmdbId = parseInt(id || '0');
  const season = parseInt(searchParams.get('season') || '1');
  const episode = parseInt(searchParams.get('episode') || '1');
  const title = searchParams.get('title') || 'TV Show';
  const initialTime = parseFloat(searchParams.get('time') || '0');
  const fromPage = searchParams.get('from') || '/';
  
  // Get saved progress for this episode
  const historyItem = getHistoryItem(tmdbId, 'tv', season, episode);
  const savedTime = historyItem?.currentTime || initialTime;

  // Store the original page when component mounts
  useEffect(() => {
    setOriginalPage(fromPage);
  }, [fromPage]);

  // Fetch show data and seasons for proper navigation
  useEffect(() => {
    const fetchShowData = async () => {
      try {
        const showResponse = await api.getShowDetails(tmdbId);
        setShowData(showResponse.data);
        setSeasons(showResponse.data.seasons || []);
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

  // Handle next episode navigation
  const handleNextEpisode = async () => {
    const currentSeason = seasons.find(s => s.season_number === season);
    const currentSeasonEpisodes = currentSeason?.episode_count || 0;
    
    let nextSeason = season;
    let nextEpisode = episode + 1;
    
    // First, try to check if the next episode in the same season exists
    if (nextEpisode <= currentSeasonEpisodes) {
      try {
        // Try to fetch the next episode to see if it exists
        await api.getShowSeason(tmdbId, season);
        // If successful, navigate to next episode in same season
        const encodedTitle = encodeURIComponent(showData?.name || title);
        navigate(`/tv/${tmdbId}?title=${encodedTitle}&season=${nextSeason}&episode=${nextEpisode}&from=${encodeURIComponent(originalPage)}`);
        return;
      } catch (error) {
        console.log(`Episode ${nextEpisode} doesn't exist in season ${season}, moving to next season`);
        // Episode doesn't exist, move to next season
        nextSeason = season + 1;
        nextEpisode = 1;
      }
    } else {
      // We're at the last episode of the season, move to next season
      nextSeason = season + 1;
      nextEpisode = 1;
    }
    
    // Check if next season exists
    const nextSeasonData = seasons.find(s => s.season_number === nextSeason);
    if (!nextSeasonData) {
      console.log('No more seasons available');
      return; // No more seasons, stay on current episode
    }
    
    // Try to verify the next season has episodes
    try {
      await api.getShowSeason(tmdbId, nextSeason);
      // If successful, navigate to first episode of next season
      const encodedTitle = encodeURIComponent(showData?.name || title);
      navigate(`/tv/${tmdbId}?title=${encodedTitle}&season=${nextSeason}&episode=${nextEpisode}&from=${encodeURIComponent(originalPage)}`);
    } catch (error) {
      console.log(`Season ${nextSeason} doesn't exist or has no episodes`);
      // Next season doesn't exist or has no episodes, stay on current episode
      return;
    }
  };

  // Handle back navigation - go to original page instead of episode history
  const handleClose = () => {
    // Navigate directly to the original page
    navigate(originalPage);
  };

  return (
    <VideoPlayer
      tmdbId={tmdbId}
      type="tv"
      season={season}
      episode={episode}
      title={`${title} - S${season}E${episode}`}
      initialTime={savedTime}
      onClose={handleClose}
      onNextEpisode={handleNextEpisode}
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