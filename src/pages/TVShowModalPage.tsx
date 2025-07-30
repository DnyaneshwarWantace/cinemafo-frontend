import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api, { TVShow, cacheUtils } from '@/services/api';
import TVShowPlayer from '@/components/TVShowPlayer';

const TVShowModalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the original page from URL params or use fallback
  const fromPage = searchParams.get('from') || '/';

  useEffect(() => {
    if (!id) return;

    // First, check if we have cached data and show it immediately
    const cachedShow = cacheUtils.getShowFromCache(Number(id));
    if (cachedShow) {
      console.log('📺 ⚡ INSTANT load from cache for show ID:', id);
      setShow(cachedShow);
      setLoading(false);
      return;
    }

    // If no cache, fetch from API
    const fetchShow = async () => {
      try {
        console.log('📺 Fetching TV show details for ID:', id);
        setLoading(true);
        const response = await api.getShowDetails(Number(id));
        console.log('📺 TV show data received:', !!response.data);
        setShow(response.data);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching TV show:', err);
        setError('Failed to load TV show');
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [id]);

  const handleClose = () => {
    // Navigate back to the original page that opened the modal
    console.log('📺 TVShowModalPage: Closing, navigating to:', fromPage);
    navigate(fromPage);
  };

  // Show TV show data when available
  if (show) {
    return <TVShowPlayer show={show} onClose={handleClose} />;
  }

  // Show error if failed to load
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">TV Show not found</h2>
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

export default TVShowModalPage;