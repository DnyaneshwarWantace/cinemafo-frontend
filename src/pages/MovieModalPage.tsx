import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api, { Movie, cacheUtils } from '@/services/api';
import MovieModal from '@/components/MovieModal';

const MovieModalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the original page from URL params or use fallback
  const fromPage = searchParams.get('from') || '/';

  useEffect(() => {
    if (!id) return;

    // First, check if we have cached data and show it immediately
    const cachedMovie = cacheUtils.getMovieFromCache(Number(id));
    if (cachedMovie) {
      console.log('🎬 ⚡ INSTANT load from cache for movie ID:', id);
      setMovie(cachedMovie);
      setLoading(false);
      return;
    }

    // If no cache, fetch from API
    const fetchMovie = async () => {
      try {
        console.log('🎬 Fetching movie details for ID:', id);
        setLoading(true);
        const response = await api.getMovieDetails(Number(id));
        console.log('🎬 Movie data received:', !!response.data);
        setMovie(response.data);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching movie:', err);
        setError('Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  const handleClose = () => {
    // Navigate back to the original page that opened the modal
    console.log('🎬 MovieModalPage: Closing, navigating to:', fromPage);
    navigate(fromPage);
  };

  // Show movie data when available
  if (movie) {
    return <MovieModal movie={movie} onClose={handleClose} />;
  }

  // Show error if failed to load
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Movie not found</h2>
          <button 
            onClick={handleClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show minimal loading (no big spinner)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Fallback - shouldn't reach here
  return <div className="fixed inset-0 bg-black z-50"></div>;
};

export default MovieModalPage;