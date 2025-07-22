import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Play, Info, Heart, Star, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';
import { Movie, TVShow } from '@/services/api';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState<(Movie | TVShow)[]>([]);
  const [selectedItem, setSelectedItem] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Listen for storage changes to update watchlist
  useEffect(() => {
    const handleStorageChange = () => {
      loadWatchlist();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadWatchlist = () => {
    try {
      const saved = localStorage.getItem('watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      } else {
        setWatchlist([]);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = (e: React.MouseEvent, item: Movie | TVShow) => {
    e.stopPropagation();
    try {
    const updatedWatchlist = watchlist.filter(watchlistItem => 
      watchlistItem.id !== item.id || watchlistItem.media_type !== item.media_type
    );
    setWatchlist(updatedWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      console.log('Removed item from watchlist:', item);
    } catch (error) {
      console.error('Error removing item from watchlist:', error);
    }
  };

  const handleItemClick = (item: Movie | TVShow) => {
    setSelectedItem(item);
  };

  const clearWatchlist = () => {
    console.log('Clear watchlist function called');
    try {
    setWatchlist([]);
    localStorage.removeItem('watchlist');
      console.log('Watchlist cleared successfully');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
    }
  };

  const getItemTitle = (item: Movie | TVShow): string => {
    return 'title' in item ? item.title : item.name;
  };

  const getItemReleaseDate = (item: Movie | TVShow): string => {
    return 'release_date' in item ? item.release_date : item.first_air_date;
  };

  const formatReleaseDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 sm:pt-20 md:pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 sm:pt-20 md:pt-20 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8 py-8 relative">
        {/* Header with Clear All Button */}
        <div className="mb-8 flex justify-between items-start">
          <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">My Watchlist</h1>
          <p className="text-xl text-gray-400">
            {watchlist.length === 0 
              ? "Your watchlist is empty. Start adding movies and TV shows!" 
              : `${watchlist.length} item${watchlist.length !== 1 ? 's' : ''} in your watchlist`
            }
          </p>
        </div>

          {/* Clear All Button */}
        {watchlist.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked!');
                clearWatchlist();
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer z-50"
              style={{ pointerEvents: 'auto' }}
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
          </div>

        {/* Watchlist Items */}
        {watchlist.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No items in watchlist</h3>
            <p className="text-gray-500">Start browsing movies and TV shows to add them to your watchlist.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {watchlist.map((item) => (
              <div
                key={`${item.id}-${item.media_type}`}
                className="group relative bg-gray-900/50 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <div className="aspect-[2/3] relative overflow-hidden">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={getItemTitle(item)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/300x450/1f2937/6b7280?text=No+Image';
                    }}
                  />
                  
                  {/* Individual Delete Button */}
                  <button
                    onClick={(e) => removeFromWatchlist(e, item)}
                    className="absolute top-2 left-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                    title="Remove from watchlist"
                  >
                    <X size={14} />
                  </button>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="crystal-play-button">
                      {/* Triangle is created via CSS ::before pseudo-element */}
                    </div>
                  </div>
                  
                  {/* Rating Badge */}
                  {typeof item.vote_average === 'number' && (
                    <div className="absolute top-2 right-2 bg-black/80 text-yellow-400 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 z-10">
                      <Star className="w-3 h-3" />
                      {item.vote_average.toFixed(1)}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div>
                      <h3 className="text-white font-semibold text-sm line-clamp-2">
                        {getItemTitle(item)}
                      </h3>
                      <p className="text-gray-300 text-xs mt-1">
                        {formatReleaseDate(getItemReleaseDate(item))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Movie Modal */}
      {selectedItem && 'title' in selectedItem && (
        <MovieModal
          movie={selectedItem as Movie}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* TV Show Player */}
      {selectedItem && 'name' in selectedItem && (
        <TVShowPlayer
          show={selectedItem as TVShow}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default Watchlist; 