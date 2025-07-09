import React, { useState, useEffect } from 'react';
import { Play, Clock } from 'lucide-react';
import { Movie, TVShow } from '@/services/api';

interface WatchHistoryItem {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  type: 'movie' | 'tv';
  progress: number; // percentage (0-100)
  timestamp: number;
  episode?: {
    season: number;
    episode: number;
    name: string;
  };
}

interface ContinueWatchingProps {
  onItemClick: (item: Movie | TVShow) => void;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onItemClick }) => {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    loadWatchHistory();
    
    // Listen for watch history updates
    const handleWatchHistoryUpdate = () => {
      loadWatchHistory();
    };

    window.addEventListener('watchHistoryUpdated', handleWatchHistoryUpdate);
    return () => window.removeEventListener('watchHistoryUpdated', handleWatchHistoryUpdate);
  }, []);

  const loadWatchHistory = () => {
    const savedHistory = localStorage.getItem('watchHistory');
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      // Sort by timestamp (most recent first) and take top 10
      const sortedHistory = history
        .sort((a: WatchHistoryItem, b: WatchHistoryItem) => b.timestamp - a.timestamp)
        .slice(0, 10);
      setWatchHistory(sortedHistory);
    }
  };

  const formatProgress = (progress: number) => {
    if (progress < 5) return 'Just started';
    if (progress > 95) return 'Almost finished';
    return `${Math.round(progress)}% watched`;
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleItemClick = (item: WatchHistoryItem) => {
    // Convert watch history item back to Movie/TVShow format
    const contentItem = {
      id: item.id,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: 0,
      overview: '',
      genres: [],
      ...(item.type === 'movie' 
        ? { 
            title: item.title,
            release_date: '2024-01-01'
          }
        : { 
            name: item.title,
            first_air_date: '2024-01-01'
          })
    };
    
    onItemClick(contentItem as Movie | TVShow);
  };

  if (watchHistory.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6 px-4 md:px-12">
        <Clock className="text-blue-400" size={24} />
        <h2 className="text-2xl font-bold text-white">Continue Watching</h2>
      </div>
      
      <div className="relative px-4 md:px-12">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {watchHistory.map((item) => (
            <div 
              key={`${item.id}-${item.timestamp}`}
              className="flex-shrink-0 w-80 cursor-pointer group"
              onClick={() => handleItemClick(item)}
            >
              <div className="relative bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                {/* Backdrop Image */}
                <div className="relative h-44">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.backdrop_path || item.poster_path}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
                    }}
                  />
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-3">
                      <Play className="text-white" size={24} fill="white" />
                    </div>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-lg mb-2 line-clamp-1">
                    {item.title}
                  </h3>
                  
                  {item.episode && (
                    <p className="text-blue-400 text-sm mb-2">
                      S{item.episode.season} E{item.episode.episode}: {item.episode.name}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{formatProgress(item.progress)}</span>
                    <span>{formatTimestamp(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Utility function to add/update watch history
export const updateWatchHistory = (
  id: number,
  title: string,
  poster_path: string,
  backdrop_path: string,
  type: 'movie' | 'tv',
  progress: number,
  episode?: { season: number; episode: number; name: string }
) => {
  const savedHistory = localStorage.getItem('watchHistory');
  let history: WatchHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
  
  // Remove existing entry for the same content
  history = history.filter(item => !(item.id === id && item.type === type));
  
  // Add new entry
  const newItem: WatchHistoryItem = {
    id,
    title,
    poster_path,
    backdrop_path,
    type,
    progress,
    timestamp: Date.now(),
    episode
  };
  
  history.unshift(newItem);
  
  // Keep only last 50 items
  history = history.slice(0, 50);
  
  localStorage.setItem('watchHistory', JSON.stringify(history));
  
  // Notify components about the update
  window.dispatchEvent(new CustomEvent('watchHistoryUpdated'));
};

export default ContinueWatching; 