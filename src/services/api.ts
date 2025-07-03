import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  media_type?: string;
  original_language?: string;
  available_languages?: string[];
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  media_type?: string;
  number_of_seasons?: number;
  seasons?: Season[];
  original_language?: string;
  available_languages?: string[];
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
  // Movies
  getTrendingMovies: (language?: string) => 
    axios.get(`${BASE_URL}/movies/trending`, { params: { language } }),
  getPopularMovies: (language?: string) => 
    axios.get(`${BASE_URL}/movies/popular`, { params: { language } }),
  getTopRatedMovies: (language?: string) => 
    axios.get(`${BASE_URL}/movies/top-rated`, { params: { language } }),
  getUpcomingMovies: (language?: string) => 
    axios.get(`${BASE_URL}/movies/upcoming`, { params: { language } }),
  getNowPlayingMovies: (language?: string) => 
    axios.get(`${BASE_URL}/movies/now-playing`, { params: { language } }),
  getMoviesByGenre: (genreId: number, language?: string) => 
    axios.get(`${BASE_URL}/movies/genre/${genreId}`, { params: { language } }),
  getMovieDetails: (movieId: number, language?: string) => 
    axios.get(`${BASE_URL}/movies/${movieId}`, { params: { language } }),
  getMovieTrailer: (movieId: number, language?: string) => 
    axios.get(`${BASE_URL}/movies/${movieId}/trailer`, { params: { language } }),
  
  // TV Shows
  getTrendingShows: (language?: string) => 
    axios.get(`${BASE_URL}/tv/trending`, { params: { language } }),
  getPopularShows: (language?: string) => 
    axios.get(`${BASE_URL}/tv/popular`, { params: { language } }),
  getTopRatedShows: (language?: string) => 
    axios.get(`${BASE_URL}/tv/top-rated`, { params: { language } }),
  getShowsByGenre: (genreId: number, language?: string) => 
    axios.get(`${BASE_URL}/tv/genre/${genreId}`, { params: { language } }),
  getShowDetails: (showId: number, language?: string) => 
    axios.get(`${BASE_URL}/tv/${showId}`, { params: { language } }),
  getShowTrailer: (showId: number, language?: string) => 
    axios.get(`${BASE_URL}/tv/${showId}/trailer`, { params: { language } }),
  getShowSeason: (showId: number, seasonNumber: number, language?: string) => 
    axios.get(`${BASE_URL}/tv/${showId}/season/${seasonNumber}`, { params: { language } }),

  // Search
  search: (query: string, language?: string) => 
    axios.get(`${BASE_URL}/search`, { params: { query, language } }),
  
  // Genres
  getMovieGenres: (language?: string) => 
    axios.get(`${BASE_URL}/genres/movie`, { params: { language } }),
  getTVGenres: (language?: string) => 
    axios.get(`${BASE_URL}/genres/tv`, { params: { language } }),

  // Languages
  getAvailableLanguages: (contentId: number, type: 'movie' | 'tv') =>
    axios.get(`${BASE_URL}/${type}/${contentId}/languages`),
};

export default api; 