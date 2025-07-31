import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCarousel from '@/components/MovieCarousel';
import VideoPlayer from '@/components/VideoPlayer';
import HeroSlider from '@/components/HeroSlider';
import ContinueWatching from '@/components/ContinueWatching';
import AdBanner from '@/components/AdBanner';
import LoadingBar from '@/components/LoadingBar';
import useAdminSettings from '@/hooks/useAdminSettings';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useGlobalContent } from '@/hooks/useGlobalContent';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { Movie, TVShow } from '@/services/api';

const Home = () => {
  const navigate = useNavigate();
  const [continueWatchingKey, setContinueWatchingKey] = useState(0);
  const { settings: adminSettings } = useAdminSettings();
  const { getContinueWatching, updateProgress, removeFromHistory, getThumbnailUrl, watchHistory } = useWatchHistory();
  const { 
    trendingMovies, 
    popularMovies, 
    trendingShows, 
    popularShows, 
    isLoading: loading, 
    error, 
    fetchContent 
  } = useGlobalContent();

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Watch for changes in watch history to update continue watching section
  useEffect(() => {
    setContinueWatchingKey(prev => prev + 1);
  }, [watchHistory]);

  // Refresh continue watching data when page becomes visible (user returns from player)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Force refresh of continue watching section when page becomes visible
        setContinueWatchingKey(prev => prev + 1);
      }
    };

    const handleFocus = () => {
      // Force refresh of continue watching section when window gains focus
      setContinueWatchingKey(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleContentClick = (content: Movie | TVShow) => {
    // Get current page to pass as 'from' parameter  
    const currentPage = location.pathname + location.search;
    
    // If it has a title, it's a movie; if it has a name, it's a show
    if ('title' in content) {
      navigate(`/movie-modal/${content.id}?from=${encodeURIComponent(currentPage)}`);
    } else {
      navigate(`/tv-modal/${content.id}?from=${encodeURIComponent(currentPage)}`);
    }
  };

  const handleContinueWatchingClick = async (historyItem: any) => {
    try {
      // Navigate to the appropriate route instead of opening modal
      const currentPage = window.location.pathname;
      if (historyItem.type === 'movie') {
        const title = encodeURIComponent(historyItem.title || 'Movie');
        navigate(`/movie/${historyItem.id}?title=${title}&time=${historyItem.currentTime}&from=${encodeURIComponent(currentPage)}`);
      } else {
        const title = encodeURIComponent(historyItem.title || 'TV Show');
        navigate(`/tv/${historyItem.id}?title=${title}&season=${historyItem.season}&episode=${historyItem.episode}&time=${historyItem.currentTime}&from=${encodeURIComponent(currentPage)}`);
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
      {/* Loading Bar */}
      <LoadingBar isLoading={loading} />
      
      {/* Hero Section */}
      <section className="w-full">
        <HeroSlider 
          items={[...trendingMovies, ...trendingShows].slice(0, 5)}
          onItemClick={handleContentClick}
        />
      </section>

      {/* Continue Watching Section - Overlaps with Hero */}
      {!loading && (() => {
        try {
          const continueWatchingItems = getContinueWatching(10);
          return continueWatchingItems.length > 0 ? (
        <section className="relative -mt-32 lg:-mt-32 z-10">
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                  <ContinueWatching
                    key={continueWatchingKey}
                    items={continueWatchingItems}
                    onItemClick={handleContinueWatchingClick}
                    onRemoveItem={handleRemoveFromHistory}
                    getThumbnailUrl={getThumbnailUrl}
                  />
                </div>
              </div>
            </section>
          ) : null;
        } catch (error) {
          console.error('Error rendering continue watching section:', error);
          return null;
        }
      })()}



      {/* Trending Movies Section */}
      {!loading && trendingMovies.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-8">
              <MovieCarousel
                title="Trending Movies"
                items={trendingMovies}
                onItemClick={handleContentClick}
              />
        </section>
      )}

      {/* Content Sections */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-12 py-8">
        {!loading && (
          <>
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




    </div>
    </ErrorBoundary>
  );
};

export default Home; 