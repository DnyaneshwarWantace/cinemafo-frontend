import React, { useState, useEffect } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import AnnouncementBar from '@/components/AnnouncementBar';
import MovieModal from '@/components/MovieModal';
import TVShowPlayer from '@/components/TVShowPlayer';
import { Trash2, Play, Calendar, Star } from 'lucide-react';

const Watchlist = () => {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'movie' | 'tv'>('movie');

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setSelectedType(item.type);
  };

  const handleRemove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist(id);
  };

  const movieItems = watchlist.filter(item => item.type === 'movie');
  const tvItems = watchlist.filter(item => item.type === 'tv');

  useEffect(() => {
    // Any initialization if needed
  }, []);

  // Handle custom events from "More Like This" clicks
  useEffect(() => {
    const handleOpenMovieModal = (event: any) => {
      const movie = event.detail;
      handleItemClick(movie);
    };

    const handleOpenShowModal = (event: any) => {
      const show = event.detail;
      handleItemClick(show);
    };

    window.addEventListener('openMovieModal', handleOpenMovieModal);
    window.addEventListener('openShowModal', handleOpenShowModal);

    return () => {
      window.removeEventListener('openMovieModal', handleOpenMovieModal);
      window.removeEventListener('openShowModal', handleOpenShowModal);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <AnnouncementBar />
      <Navigation inModalView={false} />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">My Watchlist</h1>
            <p className="text-gray-400 text-lg">
              {watchlist.length === 0 
                ? "You haven't added anything to your watchlist yet." 
                : `${watchlist.length} item${watchlist.length !== 1 ? 's' : ''} in your watchlist`
              }
            </p>
          </div>

          {watchlist.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📺</div>
              <h2 className="text-2xl font-bold text-white mb-2">Your watchlist is empty</h2>
              <p className="text-gray-400 mb-8">Start adding movies and TV shows to keep track of what you want to watch!</p>
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold transition-colors"
              >
                Browse Movies & Shows
              </a>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Movies Section */}
              {movieItems.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Movies ({movieItems.length})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {movieItems.map((item) => (
                      <div
                        key={`movie-${item.id}`}
                        className="group cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-3">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-poster.jpg';
                            }}
                          />
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Play size={32} className="text-white" />
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={(e) => handleRemove(item.id, e)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* Added Date */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                              <Calendar size={12} />
                              <span>Added {new Date(item.added_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                          {item.title || item.name}
                        </h3>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TV Shows Section */}
              {tvItems.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">TV Shows ({tvItems.length})</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {tvItems.map((item) => (
                      <div
                        key={`tv-${item.id}`}
                        className="group cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-3">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-poster.jpg';
                            }}
                          />
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Play size={32} className="text-white" />
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={(e) => handleRemove(item.id, e)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            <Trash2 size={16} />
                          </button>

                          {/* Added Date */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                              <Calendar size={12} />
                              <span>Added {new Date(item.added_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                          {item.title || item.name}
                        </h3>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Floating Social Buttons */}
      <FloatingSocialButtons />

      {/* Modals */}
      {selectedItem && selectedType === 'movie' && (
        <MovieModal 
          movie={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
      
      {selectedItem && selectedType === 'tv' && (
        <TVShowPlayer 
          show={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default Watchlist;