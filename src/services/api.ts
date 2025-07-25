import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://cinemafo.lol/api';
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Fallback API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Client-side cache for movie details
const movieCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getCacheKey = (endpoint: string, id?: number, params?: any) => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${endpoint}_${id || ''}_${paramString}`;
};

const getFromCache = (key: string) => {
  const cached = movieCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache HIT for ${key}`);
    return cached.data;
  }
  if (cached) {
    movieCache.delete(key);
  }
  return null;
};

const setCache = (key: string, data: any) => {
  if (movieCache.size >= 200) {
    const oldestKey = movieCache.keys().next().value;
    movieCache.delete(oldestKey);
  }
  movieCache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 Cache SET for ${key} (size: ${movieCache.size})`);
};

// Cache management utilities
export const cacheUtils = {
  clear: () => {
    movieCache.clear();
    console.log('🗑️ Cache cleared');
  },
  
  clearMovie: (movieId: number) => {
    const keysToDelete = Array.from(movieCache.keys()).filter(key => 
      key.includes(`_${movieId}_`)
    );
    keysToDelete.forEach(key => movieCache.delete(key));
    console.log(`🗑️ Cleared cache for movie ${movieId}`);
  },
  
  getStats: () => ({
    size: movieCache.size,
    keys: Array.from(movieCache.keys())
  }),
  
  // Clear all cache and force fresh data fetch
  clearAll: () => {
    movieCache.clear();
    console.log('🗑️ All cache cleared - will fetch fresh data on next request');
  },
  
  // Clear cache for specific data types
  clearMovies: () => {
    const keysToDelete = Array.from(movieCache.keys()).filter(key => 
      key.includes('movies') || key.includes('movie')
    );
    keysToDelete.forEach(key => movieCache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} movie cache entries`);
  },
  
  clearShows: () => {
    const keysToDelete = Array.from(movieCache.keys()).filter(key => 
      key.includes('shows') || key.includes('tv')
    );
    keysToDelete.forEach(key => movieCache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} TV show cache entries`);
  }
};

// Fallback TMDB API functions
const fetchFromTMDB = async (endpoint: string, params: any = {}) => {
  try {
    console.log(`🔄 Fallback: Fetching from TMDB API: ${endpoint}`);
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        ...params
      },
      timeout: 10000
    });
    console.log(`✅ Fallback: TMDB API success for ${endpoint}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Fallback: TMDB API failed for ${endpoint}:`, error.message);
    throw error;
  }
};

// Check if data contains sample/placeholder content
const isSampleData = (data: any) => {
  if (!data || !data.results || !Array.isArray(data.results)) {
    return true;
  }
  
  // Check if any result has sample movie titles
  return data.results.some((item: any) => 
    item.title?.includes('Sample Movie') || 
    item.name?.includes('Sample Show') ||
    item.overview?.includes('sample content while the API is unavailable')
  );
};

// Validate and clean movie/show data
const validateAndCleanData = (data: any) => {
  if (!data || !data.results || !Array.isArray(data.results)) {
    return data;
  }
  
  // Clean each result
  data.results = data.results.map((item: any) => {
    // Ensure required fields exist
    if (!item.id) return null;
    
    // Clean title/name
    if (!item.title && !item.name) {
      item.title = 'Unknown Title';
    }
    
    // Clean overview
    if (!item.overview) {
      item.overview = 'No overview available.';
    }
    
    // Clean poster_path
    if (!item.poster_path || item.poster_path === 'null' || item.poster_path === 'undefined') {
      item.poster_path = null;
    }
    
    // Clean backdrop_path
    if (!item.backdrop_path || item.backdrop_path === 'null' || item.backdrop_path === 'undefined') {
      item.backdrop_path = null;
    }
    
    // Clean release_date/first_air_date
    if (item.release_date && (item.release_date === 'null' || item.release_date === 'undefined' || item.release_date === 'Invalid Date')) {
      item.release_date = null;
    }
    if (item.first_air_date && (item.first_air_date === 'null' || item.first_air_date === 'undefined' || item.first_air_date === 'Invalid Date')) {
      item.first_air_date = null;
    }
    
    // Clean vote_average
    if (typeof item.vote_average !== 'number' || isNaN(item.vote_average)) {
      item.vote_average = 0;
    }
    
    // Clean vote_count
    if (typeof item.vote_count !== 'number' || isNaN(item.vote_count)) {
      item.vote_count = 0;
    }
    
    // Ensure genres array exists
    if (!item.genres || !Array.isArray(item.genres)) {
      item.genres = [];
    }
    
    return item;
  }).filter(Boolean); // Remove null items
  
  return data;
};

// Clear cache for specific endpoints when sample data is detected
const clearSampleDataCache = (endpoint: string) => {
  const keysToDelete = Array.from(movieCache.keys()).filter(key => 
    key.includes(endpoint)
  );
  keysToDelete.forEach(key => {
    movieCache.delete(key);
    console.log(`🗑️ Cleared sample data cache for: ${key}`);
  });
};

export interface Movie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  media_type?: string;
  original_language?: string;
  available_languages?: string[];
  runtime?: number;
  status?: string;
  budget?: number;
  revenue?: number;
  tagline?: string;
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  production_countries?: {
    iso_3166_1: string;
    name: string;
  }[];
  spoken_languages?: {
    iso_639_1: string;
    name: string;
  }[];
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew?: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }[];
  keywords?: {
    id: number;
    name: string;
  }[];
  recommendations?: {
    id: number;
    title: string;
    poster_path: string;
    vote_average: number;
  }[];
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  media_type?: string;
  number_of_seasons?: number;
  seasons?: Season[];
  original_language?: string;
  available_languages?: string[];
  runtime?: number;
  status?: string;
  budget?: number;
  revenue?: number;
  tagline?: string;
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }[];
  production_countries?: {
    iso_3166_1: string;
    name: string;
  }[];
  spoken_languages?: {
    iso_639_1: string;
    name: string;
  }[];
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew?: {
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }[];
  keywords?: {
    id: number;
    name: string;
  }[];
  recommendations?: {
    id: number;
    title: string;
    poster_path: string;
    vote_average: number;
  }[];
}

export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  overview: string;
  poster_path: string;
}

export interface Episode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string;
  air_date: string;
  vote_average: number;
}

const api = {
  // Movies - All with caching
  getTrendingMovies: async (language?: string) => {
    const cacheKey = getCacheKey('trending_movies', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🎬 Fetching trending movies from backend...');
      const response = await axios.get(`${BASE_URL}/movies/trending`, { params: { language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('trending_movies');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        const tmdbData = await fetchFromTMDB('/trending/movie/week', { language });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error;
      }
    }
  },

  getPopularMovies: async (language?: string) => {
    const cacheKey = getCacheKey('popular_movies', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🎬 Fetching popular movies from backend...');
      const response = await axios.get(`${BASE_URL}/movies/popular`, { params: { language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('popular_movies');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        const tmdbData = await fetchFromTMDB('/movie/popular', { language });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error;
      }
    }
  },

  getTopRatedMovies: async (language?: string) => {
    const cacheKey = getCacheKey('top_rated_movies', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      // Try backend first
      console.log('🎬 Fetching top rated movies from backend...');
      const response = await axios.get(`${BASE_URL}/movies/top-rated`, { params: { language } });
      
      // Check if backend returned sample data
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('top_rated_movies');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      setCache(cacheKey, response.data);
      return response;
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
                      try {
                  // Fallback to direct TMDB API
                  const tmdbData = await fetchFromTMDB('/movie/top_rated', { language });
                  const cleanedData = validateAndCleanData(tmdbData);
                  setCache(cacheKey, cleanedData);
                  return { data: cleanedData };
                } catch (fallbackError) {
                  console.error('❌ Both backend and fallback failed:', fallbackError);
                  throw error; // Throw original error
                }
    }
  },

  getUpcomingMovies: (language?: string) => {
    const cacheKey = getCacheKey('upcoming_movies', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/movies/upcoming`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getNowPlayingMovies: (language?: string) => {
    const cacheKey = getCacheKey('now_playing_movies', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/movies/now-playing`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getMoviesByGenre: (genreId: number, language?: string) => {
    const cacheKey = getCacheKey('movies_by_genre', genreId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/movies/genre/${genreId}`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getMovieDetails: (movieId: number, language?: string) => {
    const cacheKey = getCacheKey('movie_details', movieId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/movies/${movieId}`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getMovieTrailer: (movieId: number, language?: string) => {
    const cacheKey = getCacheKey('movie_trailer', movieId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/movies/${movieId}/trailer`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },
  
  // TV Shows - All with caching
  getTrendingShows: async (language?: string) => {
    const cacheKey = getCacheKey('trending_shows', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🎬 Fetching trending shows from backend...');
      const response = await axios.get(`${BASE_URL}/tv/trending`, { params: { language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('trending_shows');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        const tmdbData = await fetchFromTMDB('/trending/tv/week', { language });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error;
      }
    }
  },

  getPopularShows: async (language?: string) => {
    const cacheKey = getCacheKey('popular_shows', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🎬 Fetching popular shows from backend...');
      const response = await axios.get(`${BASE_URL}/tv/popular`, { params: { language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('popular_shows');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        const tmdbData = await fetchFromTMDB('/tv/popular', { language });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error;
      }
    }
  },

  getTopRatedShows: async (language?: string) => {
    const cacheKey = getCacheKey('top_rated_shows', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🎬 Fetching top rated shows from backend...');
      const response = await axios.get(`${BASE_URL}/tv/top-rated`, { params: { language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('top_rated_shows');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        const tmdbData = await fetchFromTMDB('/tv/top_rated', { language });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error;
      }
    }
  },

  getShowsByGenre: (genreId: number, language?: string) => {
    const cacheKey = getCacheKey('shows_by_genre', genreId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/genre/${genreId}`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getShowDetails: (showId: number, language?: string) => {
    const cacheKey = getCacheKey('show_details', showId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/${showId}`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getShowTrailer: (showId: number, language?: string) => {
    const cacheKey = getCacheKey('show_trailer', showId, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/${showId}/trailer`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getShowSeason: (showId: number, seasonNumber: number, language?: string) => {
    const cacheKey = getCacheKey('show_season', showId, { season: seasonNumber, language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/${showId}/season/${seasonNumber}`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  // Search - with caching and fallback
  search: async (query: string, language?: string) => {
    const cacheKey = getCacheKey('search', undefined, { query, language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    try {
      console.log('🔍 Searching from backend...');
      const response = await axios.get(`${BASE_URL}/search`, { params: { query, language } });
      
      if (isSampleData(response.data)) {
        console.log('⚠️ Backend returned sample data, trying TMDB fallback...');
        clearSampleDataCache('search');
        throw new Error('Backend returned sample data');
      }
      
      console.log('✅ Backend returned real data');
      const cleanedData = validateAndCleanData(response.data);
      setCache(cacheKey, cleanedData);
      return { data: cleanedData };
    } catch (error) {
      console.log('🔄 Backend failed, using TMDB fallback...');
      
      try {
        // Fallback to direct TMDB API
        const tmdbData = await fetchFromTMDB('/search/multi', { 
          query, 
          language,
          include_adult: false,
          page: 1
        });
        const cleanedData = validateAndCleanData(tmdbData);
        setCache(cacheKey, cleanedData);
        return { data: cleanedData };
      } catch (fallbackError) {
        console.error('❌ Both backend and fallback failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  },
  
  // Genres - with caching (longer cache since genres rarely change)
  getMovieGenres: (language?: string) => {
    const cacheKey = getCacheKey('movie_genres', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/genres/movie`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getTVGenres: (language?: string) => {
    const cacheKey = getCacheKey('tv_genres', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/genres/tv`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  // Languages - with caching
  getAvailableLanguages: (contentId: number, type: 'movie' | 'tv') => {
    const cacheKey = getCacheKey('available_languages', contentId, { type });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/${type}/${contentId}/languages`)
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  // New TV show category endpoints
  getWebSeries: (language?: string) => {
    const cacheKey = getCacheKey('web_series', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/web-series`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getCrimeDramas: (language?: string) => {
    const cacheKey = getCacheKey('crime_dramas', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/crime-dramas`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getSciFiFantasy: (language?: string) => {
    const cacheKey = getCacheKey('sci_fi_fantasy', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/sci-fi-fantasy`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },

  getComedySeries: (language?: string) => {
    const cacheKey = getCacheKey('comedy_series', undefined, { language });
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return Promise.resolve({ data: cached });
    }
    
    return axios.get(`${BASE_URL}/tv/comedy-series`, { params: { language } })
      .then(response => {
        setCache(cacheKey, response.data);
        return response;
      });
  },
};



export default api; 