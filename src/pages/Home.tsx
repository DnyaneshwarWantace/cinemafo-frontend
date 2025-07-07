import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeroSection from '../components/HeroSection';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import TVShowPlayer from '../components/TVShowPlayer';
import AdSpot from '../components/AdSpot';
import Footer from '../components/Footer';
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

      {/* Enhanced Footer with Footer component */}
      <Footer />

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