import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeroSection from '../components/HeroSection';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import TVShowPlayer from '../components/TVShowPlayer';
import AdSpot from '../components/AdSpot';
import api, { Movie, TVShow } from '@/services/api';

interface MovieRowData {
  title: string;
  movies: (Movie | TVShow)[];
  loading: boolean;
  loaded: boolean;
  genreId?: number;
}

const Home = () => {
  const [heroMovies, setHeroMovies] = useState<(Movie | TVShow)[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [movieRows, setMovieRows] = useState<MovieRowData[]>([
    { title: 'Trending Now', movies: [], loading: false, loaded: false },
    { title: 'Popular Movies', movies: [], loading: false, loaded: false },
    { title: 'Top Rated', movies: [], loading: false, loaded: false },
    { title: 'Coming Soon', movies: [], loading: false, loaded: false },
    { title: 'Trending TV Shows', movies: [], loading: false, loaded: false },
    { title: 'Popular TV Shows', movies: [], loading: false, loaded: false },
  ]);

  const observerRef = useRef<IntersectionObserver>();
  const loadedRowsRef = useRef<Set<number>>(new Set());

  // Load hero section immediately
  useEffect(() => {
    loadHeroMovies();
  }, []);

  const loadHeroMovies = async () => {
    try {
      setHeroLoading(true);
      const trending = await api.getTrendingMovies();
      setHeroMovies(trending.data?.results?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching hero movies:', error);
    } finally {
      setHeroLoading(false);
    }
  };

  const loadMovieRow = useCallback(async (index: number) => {
    if (loadedRowsRef.current.has(index)) return;
    
    loadedRowsRef.current.add(index);
    
    setMovieRows(prev => prev.map((row, i) => 
      i === index ? { ...row, loading: true } : row
    ));

    try {
      let movies: (Movie | TVShow)[] = [];
      
      switch (index) {
        case 0: // Trending Now
          const trending = await api.getTrendingMovies();
          movies = trending.data?.results || [];
          break;
        case 1: // Popular Movies
          const popular = await api.getPopularMovies();
          movies = popular.data?.results || [];
          break;
        case 2: // Top Rated
          const topRated = await api.getTopRatedMovies();
          movies = topRated.data?.results || [];
          break;
        case 3: // Coming Soon
          const upcoming = await api.getUpcomingMovies();
        const today = new Date();
          movies = upcoming.data?.results?.filter(movie => 
          new Date(movie.release_date) > today
          ) || [];
          break;
        case 4: // Trending TV Shows
          const trendingShows = await api.getTrendingShows();
          movies = trendingShows.data?.results || [];
          break;
        case 5: // Popular TV Shows
          const popularShows = await api.getPopularShows();
          movies = popularShows.data?.results || [];
          break;
      }

      setMovieRows(prev => prev.map((row, i) => 
        i === index ? { ...row, movies, loading: false, loaded: true } : row
      ));
    } catch (error) {
      console.error(`Error fetching movies for row ${index}:`, error);
      setMovieRows(prev => prev.map((row, i) => 
        i === index ? { ...row, loading: false, loaded: true } : row
      ));
    }
  }, []);

  const createObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-row-index') || '0');
          loadMovieRow(index);
        }
      });
    }, {
      rootMargin: '100px 0px', // Load when element is 100px away from viewport
      threshold: 0.1
    });
  }, [loadMovieRow]);

  useEffect(() => {
    createObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [createObserver]);

  // Handle custom events from "More Like This" clicks
  useEffect(() => {
    const handleOpenMovieModal = (event: any) => {
      const movie = event.detail;
      handleContentClick(movie);
    };

    const handleOpenShowModal = (event: any) => {
      const show = event.detail;
      handleContentClick(show);
    };

    window.addEventListener('openMovieModal', handleOpenMovieModal);
    window.addEventListener('openShowModal', handleOpenShowModal);

    return () => {
      window.removeEventListener('openMovieModal', handleOpenMovieModal);
      window.removeEventListener('openShowModal', handleOpenShowModal);
    };
  }, []);

  const observeElement = useCallback((element: HTMLDivElement | null, index: number) => {
    if (element && observerRef.current && !loadedRowsRef.current.has(index)) {
      element.setAttribute('data-row-index', index.toString());
      observerRef.current.observe(element);
    }
  }, []);

  const handleContentClick = async (content: Movie | TVShow) => {
    try {
    // If it has a title, it's a movie; if it has a name, it's a show
      if ('title' in content) {
        // Fetch complete movie details with cast/crew if not already present
        if (!content.cast || !content.crew) {
          console.log('Fetching complete movie details for:', content.title);
          const completeMovie = await api.getMovieDetails(content.id);
          setSelectedMovie(completeMovie.data);
        } else {
          setSelectedMovie(content as Movie);
        }
      } else {
        // For TV shows, fetch complete details if needed
        if (!content.cast || !content.crew) {
          console.log('Fetching complete show details for:', content.name);
          const completeShow = await api.getShowDetails(content.id);
          setSelectedShow(completeShow.data as any);
        } else {
          setSelectedShow(content as any);
        }
      }
    } catch (error) {
      console.error('Error fetching complete details:', error);
      // Fallback to original content if fetch fails
    if ('title' in content) {
      setSelectedMovie(content as Movie);
    } else {
        setSelectedShow(content as any);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <HeroSection items={heroMovies} loading={heroLoading} onItemClick={handleContentClick} />
      
      {/* Movie Rows with Lazy Loading */}
      <div className="relative z-10 -mt-32 space-y-12 pb-16">
        {movieRows.map((row, index) => (
          <div key={row.title}>
            <div ref={(el) => observeElement(el, index)}>
              <MovieRow
                title={row.title}
                movies={row.movies.map(item => ({
                  ...item,
                  title: 'title' in item ? item.title : item.name,
                  release_date: 'release_date' in item ? item.release_date : item.first_air_date
                }))}
                loading={row.loading}
                onItemClick={(movie) => {
                  const originalItem = row.movies.find(item => item.id === movie.id);
                  if (originalItem) handleContentClick(originalItem);
                }}
              />
            </div>
            
            {/* Main Page Ads */}
            {index === 0 && <AdSpot adKey="mainPageAd1" />}
            {index === 2 && <AdSpot adKey="mainPageAd2" />}
            {index === 4 && <AdSpot adKey="mainPageAd3" />}
          </div>
        ))}
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-t from-gray-900 to-black border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
                CINEMA.FO
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Your ultimate destination for premium streaming entertainment. Discover thousands of movies and TV shows, all in stunning quality with a Netflix-inspired experience.
              </p>
              
              {/* Disclaimer */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-white font-semibold mb-2">Disclaimer:</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Please note Cinema.Fo does not host any files itself but instead only display's content from 3rd party providers. Legal issues should be taken up with them.
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</a></li>
                <li><a href="/movies" className="text-gray-400 hover:text-white transition-colors text-sm">Movies</a></li>
                <li><a href="/shows" className="text-gray-400 hover:text-white transition-colors text-sm">TV Shows</a></li>
                <li><a href="/upcoming" className="text-gray-400 hover:text-white transition-colors text-sm">Upcoming</a></li>
                <li><a href="/search" className="text-gray-400 hover:text-white transition-colors text-sm">Search</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-white font-semibold mb-4">Community</h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="https://discord.gg/cinema" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Join Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 CINEMA.FO. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
      {/* TV Show Player */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </div>
  );
};

export default Home; 