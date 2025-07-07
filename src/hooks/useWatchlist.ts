import { useState, useEffect } from 'react';

interface WatchlistItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  type: 'movie' | 'tv';
  added_at: string;
}

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    // Load watchlist from localStorage on mount
    const saved = localStorage.getItem('cinema-watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading watchlist:', error);
        setWatchlist([]);
      }
    }
  }, []);

  const saveToLocalStorage = (list: WatchlistItem[]) => {
    try {
      localStorage.setItem('cinema-watchlist', JSON.stringify(list));
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  };

  const addToWatchlist = (item: any, type: 'movie' | 'tv' = 'movie') => {
    const watchlistItem: WatchlistItem = {
      id: item.id,
      title: item.title,
      name: item.name,
      poster_path: item.poster_path,
      type,
      added_at: new Date().toISOString()
    };

    const newWatchlist = [watchlistItem, ...watchlist.filter(w => w.id !== item.id)];
    setWatchlist(newWatchlist);
    saveToLocalStorage(newWatchlist);
  };

  const removeFromWatchlist = (id: number) => {
    const newWatchlist = watchlist.filter(item => item.id !== id);
    setWatchlist(newWatchlist);
    saveToLocalStorage(newWatchlist);
  };

  const isInWatchlist = (id: number) => {
    return watchlist.some(item => item.id === id);
  };

  const toggleWatchlist = (item: any, type: 'movie' | 'tv' = 'movie') => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
      return false;
    } else {
      addToWatchlist(item, type);
      return true;
    }
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist
  };
}; 