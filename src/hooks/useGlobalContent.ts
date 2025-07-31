import { useState, useEffect } from 'react';
import api, { Movie, TVShow } from '@/services/api';

interface GlobalContentState {
  trendingMovies: Movie[];
  popularMovies: Movie[];
  trendingShows: TVShow[];
  popularShows: TVShow[];
  topRatedMovies: Movie[];
  topRatedShows: TVShow[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global state outside of React components
let globalState: GlobalContentState = {
  trendingMovies: [],
  popularMovies: [],
  trendingShows: [],
  popularShows: [],
  topRatedMovies: [],
  topRatedShows: [],
  isLoading: false,
  error: null,
  lastFetched: 0,
};

let listeners: (() => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const addListener = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const isDataStale = () => {
  return Date.now() - globalState.lastFetched > CACHE_DURATION;
};

const hasBasicData = () => {
  return globalState.trendingMovies.length > 0 || 
         globalState.popularMovies.length > 0 || 
         globalState.trendingShows.length > 0 || 
         globalState.popularShows.length > 0;
};

export const useGlobalContent = () => {
  const [state, setState] = useState<GlobalContentState>(globalState);

  useEffect(() => {
    const unsubscribe = addListener(() => {
      setState(globalState);
    });
    return unsubscribe;
  }, []);

  const fetchContent = async (forceRefresh = false) => {
    // If we have recent data and not forcing refresh, return early
    if (!forceRefresh && hasBasicData() && !isDataStale()) {
      console.log('📦 Using cached global content data');
      return;
    }

    // If already loading, don't start another fetch
    if (globalState.isLoading) {
      console.log('⏳ Global content fetch already in progress');
      return;
    }

    globalState.isLoading = true;
    globalState.error = null;
    notifyListeners();

    // Helper function to add delay between requests
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      console.log('🎬 Starting global content fetch...');
      
      // Only fetch basic data if we don't have it or it's stale
      if (!hasBasicData() || isDataStale()) {
        // Sequential requests with delays to avoid TMDB rate limiting
        const trendingMoviesRes = await api.getTrendingMovies();
        await delay(300);
        
        const popularMoviesRes = await api.getPopularMovies();
        await delay(300);
        
        const trendingShowsRes = await api.getTrendingShows();
        await delay(300);
        
        const popularShowsRes = await api.getPopularShows();
        await delay(300);

        globalState.trendingMovies = trendingMoviesRes.data?.results || [];
        globalState.popularMovies = popularMoviesRes.data?.results || [];
        globalState.trendingShows = trendingShowsRes.data?.results || [];
        globalState.popularShows = popularShowsRes.data?.results || [];
      }

      // Always fetch top rated data (not fetched on home page)
      const topRatedMoviesRes = await api.getTopRatedMovies();
      await delay(300);
      
      const topRatedShowsRes = await api.getTopRatedShows();
      await delay(300);

      globalState.topRatedMovies = topRatedMoviesRes.data?.results || [];
      globalState.topRatedShows = topRatedShowsRes.data?.results || [];
      
      globalState.lastFetched = Date.now();
      globalState.error = null;
      
      console.log('✅ Global content fetch completed');
    } catch (error) {
      console.error('❌ Error fetching global content:', error);
      globalState.error = 'Failed to load content. Please try again later.';
    } finally {
      globalState.isLoading = false;
      notifyListeners();
    }
  };

  const clearCache = () => {
    globalState = {
      trendingMovies: [],
      popularMovies: [],
      trendingShows: [],
      popularShows: [],
      topRatedMovies: [],
      topRatedShows: [],
      isLoading: false,
      error: null,
      lastFetched: 0,
    };
    notifyListeners();
  };

  return {
    ...state,
    fetchContent,
    clearCache,
  };
}; 