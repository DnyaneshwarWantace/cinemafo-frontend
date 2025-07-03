import React, { useEffect, useState } from 'react';
import api, { Movie, TVShow } from '@/services/api';
import MovieCarousel from '@/components/MovieCarousel';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';
import HeroSlider from '@/components/HeroSlider';
import { Loader2 } from 'lucide-react';

const Home = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          trendingMoviesRes,
          popularMoviesRes,
          upcomingMoviesRes,
          trendingShowsRes,
          popularShowsRes
        ] = await Promise.all([
          api.getTrendingMovies(),
          api.getPopularMovies(),
          api.getUpcomingMovies(),
          api.getTrendingShows(),
          api.getPopularShows()
        ]);

        // Filter upcoming movies to only show unreleased ones
        const today = new Date();
        const actuallyUpcoming = upcomingMoviesRes.data.results.filter(movie => 
          new Date(movie.release_date) > today
        );

        setTrendingMovies(trendingMoviesRes.data.results);
        setPopularMovies(popularMoviesRes.data.results);
        setUpcomingMovies(actuallyUpcoming);
        setTrendingShows(trendingShowsRes.data.results);
        setPopularShows(popularShowsRes.data.results);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  const handleContentClick = (content: Movie | TVShow) => {
    // If it has a title, it's a movie; if it has a name, it's a show
    if ('title' in content) {
      setSelectedMovie(content as Movie);
    } else {
      setSelectedShow(content as TVShow);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="w-full">
        <HeroSlider 
          items={[...trendingMovies, ...trendingShows].slice(0, 5)}
          onItemClick={handleContentClick}
        />
      </section>

      {/* Content Sections */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-12 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {upcomingMovies.length > 0 && (
              <section>
                <MovieCarousel
                  title="Coming Soon"
                  items={upcomingMovies}
                  onItemClick={handleContentClick}
                  isUpcoming={true}
                />
              </section>
            )}

            <section>
              <MovieCarousel
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleContentClick}
              />
            </section>

            <section>
              <MovieCarousel
                title="Popular Movies"
                items={popularMovies}
                onItemClick={handleContentClick}
              />
            </section>

            <section>
              <MovieCarousel
                title="Trending TV Shows"
                items={trendingShows}
                onItemClick={handleContentClick}
              />
            </section>

            <section>
              <MovieCarousel
                title="Popular TV Shows"
                items={popularShows}
                onItemClick={handleContentClick}
              />
            </section>
          </>
        )}
      </div>

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