import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { Movie, TVShow, getCachedData, setCachedData } from '@/services/api';
import MovieCarousel from '@/components/MovieCarousel';
import VideoPlayer from '@/components/VideoPlayer';
import HeroSlider from '@/components/HeroSlider';
import ContinueWatching from '@/components/ContinueWatching';
import AdBanner from '@/components/AdBanner';
import LoadingBar from '@/components/LoadingBar';
import useAdminSettings from '@/hooks/useAdminSettings';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import ErrorBoundary from '@/components/ErrorBoundary';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';

const Home = () => {
  const navigate = useNavigate();
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingShows, setTrendingShows] = useState<TVShow[]>([]);
  const [popularShows, setPopularShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [playingContent, setPlayingContent] = useState<{
    item: Movie | TVShow;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
    initialTime?: number;
  } | null>(null);
  const { settings: adminSettings } = useAdminSettings();
  const { getContinueWatching, updateProgress, removeFromHistory, getThumbnailUrl, watchHistory } = useWatchHistory();
  
  // Get continue watching items reactively
  const continueWatchingItems = getContinueWatching(10);
  


  // Listen for TV show progress updates
  useEffect(() => {
    const handleTVShowProgressUpdate = (event: CustomEvent) => {
      const { show, currentTime, duration, season, episode, videoElement } = event.detail;
      try {
        updateProgress(
          show,
          currentTime,
          duration,
          'tv',
          season,
          episode,
          undefined, // episodeTitle
          videoElement
        );
      } catch (error) {
        console.error('Error updating TV show progress:', error);
      }
    };

    document.addEventListener('tvShowProgressUpdate', handleTVShowProgressUpdate as EventListener);
    
    return () => {
      document.removeEventListener('tvShowProgressUpdate', handleTVShowProgressUpdate as EventListener);
    };
  }, [updateProgress]);

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

        const trendingMovies = trendingMoviesRes.data?.results || [];
        const popularMovies = popularMoviesRes.data?.results || [];
        const trendingShows = trendingShowsRes.data?.results || [];
        const popularShows = popularShowsRes.data?.results || [];

        setTrendingMovies(trendingMovies);
        setPopularMovies(popularMovies);
        setTrendingShows(trendingShows);
        setPopularShows(popularShows);

        // Cache the data for reuse on other pages
        setCachedData('trending_movies', trendingMovies);
        setCachedData('popular_movies', popularMovies);
        setCachedData('trending_shows', trendingShows);
        setCachedData('popular_shows', popularShows);

        // Prefetch details for the first few items to make modal opening instant
        const prefetchDetails = async () => {
          try {
            console.log('🚀 Prefetching movie/show details for instant modal loading...');
            
            // Prefetch first 10 movies from each category
            const moviesToPrefetch = [
              ...trendingMovies.slice(0, 10),
              ...popularMovies.slice(0, 10)
            ];
            
            const showsToPrefetch = [
              ...trendingShows.slice(0, 10),
              ...popularShows.slice(0, 10)
            ];

            // No need to prefetch since backend now returns complete details
            console.log(`✅ Loaded ${moviesToPrefetch.length} movies and ${showsToPrefetch.length} shows with complete details`);
          } catch (err) {
            // Silent fail for prefetch
            console.log('Prefetch completed with some errors (normal)');
          }
        };

        // Start prefetching in background (don't wait for it)
        setTimeout(prefetchDetails, 100);
        
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
      setSelectedMovie(content);
    } else {
      setSelectedShow(content);
    }
  };

  const handleModalClose = () => {
    // Modal closed - continue watching will update automatically
  };



  const handleContinueWatchingClick = async (historyItem: any) => {
    try {
      // Find the actual content from our data
      let content: Movie | TVShow | null = null;

      if (historyItem.type === 'movie') {
        content = [...trendingMovies, ...popularMovies].find(m => m.id === historyItem.id) || null;
        if (!content) {
          // Fetch full movie details if not found
          try {
            const response = await api.getMovieDetails(historyItem.id);
            content = response.data;
          } catch (err) {
            console.error('Failed to fetch movie details:', err);
            return;
          }
        }
      } else {
        content = [...trendingShows, ...popularShows].find(s => s.id === historyItem.id) || null;
        if (!content) {
          // Fetch full show details if not found
          try {
            const response = await api.getShowDetails(historyItem.id);
            content = response.data;
          } catch (err) {
            console.error('Failed to fetch show details:', err);
            return;
          }
        }
      }

      if (content) {
        console.log('🎬 Continue watching click - TV show:', {
          id: historyItem.id,
          type: historyItem.type,
          season: historyItem.season,
          episode: historyItem.episode,
          currentTime: historyItem.currentTime
        });
        
        setPlayingContent({
          item: content,
          type: historyItem.type,
          season: historyItem.season,
          episode: historyItem.episode,
          initialTime: historyItem.currentTime
        });
      }
    } catch (error) {
      console.error('Error handling continue watching click:', error);
    }
  };

  const handleProgressUpdate = (currentTime: number, duration: number, videoElement?: HTMLVideoElement) => {
    try {
      if (playingContent) {
        // Handle progress updates from continue watching player
        updateProgress(
          playingContent.item,
          currentTime,
          duration,
          playingContent.type,
          playingContent.season,
          playingContent.episode,
          undefined, // episodeTitle
          videoElement
        );
      } else if (selectedMovie) {
        // Handle progress updates from movie modal
        updateProgress(
          selectedMovie,
          currentTime,
          duration,
          'movie',
          undefined,
          undefined,
          undefined, // episodeTitle
          videoElement
        );
      } else if (selectedShow) {
        // Handle progress updates from TV show modal
        // Note: TV show progress updates will be handled by the TVShowPlayer component
        // which will pass the correct season/episode information
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleRemoveFromHistory = (historyItem: any) => {
    try {
    removeFromHistory(historyItem.id, historyItem.type, historyItem.season, historyItem.episode);
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

      {/* Hero Overlay Ad - Above Continue Watching */}
      {!loading && adminSettings?.ads?.heroOverlayAd?.enabled && (
        <section className="relative -mt-32 lg:-mt-32 z-10">
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-2 pb-4">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <AdBanner 
                  adKey="heroOverlayAd"
                  imageUrl={adminSettings.ads.heroOverlayAd.imageUrl}
                  clickUrl={adminSettings.ads.heroOverlayAd.clickUrl}
                  enabled={adminSettings.ads.heroOverlayAd.enabled}
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Continue Watching Section - Moved down to avoid overlap with hero ad */}
      {!loading && continueWatchingItems.length > 0 && (
        <section className="relative -mt-32 lg:-mt-32 z-10">
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-40 pb-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <ContinueWatching
                items={continueWatchingItems}
                onItemClick={handleContinueWatchingClick}
                onRemoveItem={handleRemoveFromHistory}
                getThumbnailUrl={getThumbnailUrl}
              />
            </div>
          </div>
        </section>
      )}



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

      {/* Video Player for Continue Watching */}
      {playingContent && (
        <VideoPlayer
          tmdbId={playingContent.item.id}
          type={playingContent.type}
          season={playingContent.season}
          episode={playingContent.episode}
          title={'title' in playingContent.item ? playingContent.item.title : playingContent.item.name}
          onClose={() => {
            setPlayingContent(null);
          }}
          onProgressUpdate={handleProgressUpdate}
          initialTime={playingContent.initialTime}
        />
      )}

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => {
            setSelectedMovie(null);
            handleModalClose();
          }}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      {/* TV Show Modal */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => {
            setSelectedShow(null);
            handleModalClose();
          }}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

    </div>
    </ErrorBoundary>
  );
};

export default Home; 