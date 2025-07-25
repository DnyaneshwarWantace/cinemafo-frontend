import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { Movie, TVShow } from '@/services/api';
import MovieCarousel from '@/components/MovieCarousel';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';
import VideoPlayer from '@/components/VideoPlayer';
import HeroSlider from '@/components/HeroSlider';
import ContinueWatching from '@/components/ContinueWatching';
import AdBanner from '@/components/AdBanner';
import { Loader2 } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import ErrorBoundary from '@/components/ErrorBoundary';

const Home = () => {
  const navigate = useNavigate();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continueWatchingKey, setContinueWatchingKey] = useState(0);
  const { settings: adminSettings } = useAdminSettings();
  const { getContinueWatching, updateProgress, removeFromHistory, getThumbnailUrl, watchHistory } = useWatchHistory();

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          trendingMoviesRes,
          popularMoviesRes,
          trendingShowsRes,
          popularShowsRes
        ] = await Promise.all([
          api.getTrendingMovies(),
          api.getPopularMovies(),
          api.getTrendingShows(),
          api.getPopularShows()
        ]);

        setTrendingMovies(trendingMoviesRes.data?.results || []);
        setPopularMovies(popularMoviesRes.data?.results || []);
        setTrendingShows(trendingShowsRes.data?.results || []);
        setPopularShows(popularShowsRes.data?.results || []);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Watch for changes in watch history to update continue watching section
  useEffect(() => {
    setContinueWatchingKey(prev => prev + 1);
  }, [watchHistory]);

  const handleContentClick = (content: Movie | TVShow) => {
    // If it has a title, it's a movie; if it has a name, it's a show
    if ('title' in content) {
      setSelectedMovie(content as Movie);
    } else {
      setSelectedShow(content as TVShow);
    }
  };

  const handleContinueWatchingClick = async (historyItem: any) => {
    try {
      // Navigate to the appropriate route instead of opening modal
      if (historyItem.type === 'movie') {
        const title = encodeURIComponent(historyItem.title || 'Movie');
        navigate(`/movie/${historyItem.id}?title=${title}&time=${historyItem.currentTime}`);
      } else {
        const title = encodeURIComponent(historyItem.title || 'TV Show');
        navigate(`/tv/${historyItem.id}?title=${title}&season=${historyItem.season}&episode=${historyItem.episode}&time=${historyItem.currentTime}`);
      }
    } catch (error) {
      console.error('Error handling continue watching click:', error);
    }
  };

  const handleRemoveFromHistory = (historyItem: any) => {
    try {
    removeFromHistory(historyItem.id, historyItem.type, historyItem.season, historyItem.episode);
      // Force re-render of continue watching section
      setContinueWatchingKey(prev => prev + 1);
    } catch (error) {
      console.error('Error removing from history:', error);
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
    <ErrorBoundary>
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="w-full">
        <HeroSlider 
          items={[...trendingMovies, ...trendingShows].slice(0, 5)}
          onItemClick={handleContentClick}
        />
      </section>



      {/* Trending Movies Section - Overlaps with Hero */}
      {!loading && trendingMovies.length > 0 && (
        <section className="relative -mt-32 lg:-mt-32 z-10">
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <MovieCarousel
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleContentClick}
              />
            </div>
          </div>
        </section>
      )}

      {/* Content Sections */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-12 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Continue Watching Section */}
            {(() => {
              try {
                const continueWatchingItems = getContinueWatching(10);
                return continueWatchingItems.length > 0 ? (
            <ContinueWatching
                    key={continueWatchingKey}
                    items={continueWatchingItems}
              onItemClick={handleContinueWatchingClick}
              onRemoveItem={handleRemoveFromHistory}
              getThumbnailUrl={getThumbnailUrl}
            />
                ) : null;
              } catch (error) {
                console.error('Error rendering continue watching section:', error);
                return null;
              }
            })()}

            {/* Ad after Hero Section */}
            {adminSettings?.ads?.mainPageAd1?.enabled && (
              <div className="max-w-4xl mx-auto">
                <AdBanner 
                  adKey="mainPageAd1"
                  imageUrl={adminSettings.ads.mainPageAd1.imageUrl}
                  clickUrl={adminSettings.ads.mainPageAd1.clickUrl}
                  enabled={adminSettings.ads.mainPageAd1.enabled}
                />
              </div>
            )}

            <section>
              <MovieCarousel
                title="Popular Movies"
                items={popularMovies}
                onItemClick={handleContentClick}
              />
            </section>

            {/* Ad after Popular Movies */}
            {adminSettings?.ads?.mainPageAd2?.enabled && (
              <div className="max-w-4xl mx-auto">
                <AdBanner 
                  adKey="mainPageAd2"
                  imageUrl={adminSettings.ads.mainPageAd2.imageUrl}
                  clickUrl={adminSettings.ads.mainPageAd2.clickUrl}
                  enabled={adminSettings.ads.mainPageAd2.enabled}
                />
              </div>
            )}

            <section>
              <MovieCarousel
                title="Trending TV Shows"
                items={trendingShows}
                onItemClick={handleContentClick}
              />
            </section>

            {/* Ad after Trending TV Shows */}
            {adminSettings?.ads?.mainPageAd3?.enabled && (
              <div className="max-w-4xl mx-auto">
                <AdBanner 
                  adKey="mainPageAd3"
                  imageUrl={adminSettings.ads.mainPageAd3.imageUrl}
                  clickUrl={adminSettings.ads.mainPageAd3.clickUrl}
                  enabled={adminSettings.ads.mainPageAd3.enabled}
                />
              </div>
            )}

            <section>
              <MovieCarousel
                title="Popular TV Shows"
                items={popularShows}
                onItemClick={handleContentClick}
              />
            </section>

            {/* Final ad at the bottom */}
            {adminSettings?.ads?.mainPageAd4?.enabled && (
              <div className="max-w-4xl mx-auto">
                <AdBanner 
                  adKey="mainPageAd4"
                  imageUrl={adminSettings.ads.mainPageAd4.imageUrl}
                  clickUrl={adminSettings.ads.mainPageAd4.clickUrl}
                  enabled={adminSettings.ads.mainPageAd4.enabled}
                />
              </div>
            )}
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
    </ErrorBoundary>
  );
};

export default Home; 