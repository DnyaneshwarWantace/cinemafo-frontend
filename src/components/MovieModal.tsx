
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Calendar, Clock, X } from "lucide-react";

interface MovieModalProps {
  movie: any;
  onClose: () => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose }) => {
  const handleWatchNow = () => {
    // Scroll to the iframe section within the modal
    const iframeSection = document.getElementById('movie-iframe');
    if (iframeSection) {
      iframeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Dialog open={!!movie} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-gray-900 border-gray-800 text-white p-0 overflow-hidden">
        {/* Custom Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Hero Section */}
          <div className="relative h-[400px] overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path}`}
              alt={movie.title || movie.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute bottom-8 left-8 right-8">
              <h1 className="text-4xl font-bold mb-4">
                {movie.title || movie.name}
              </h1>
              
              <div className="flex items-center gap-6 text-sm text-gray-300 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-semibold text-lg">{movie.vote_average?.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
                </div>
                {movie.runtime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{movie.runtime} min</span>
                  </div>
                )}
              </div>
              
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                onClick={handleWatchNow}
              >
                <Play className="w-6 h-6 mr-3" />
                Watch Now
              </Button>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Poster */}
              <div className="md:col-span-1">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title || movie.name}
                  className="w-full rounded-lg shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              
              {/* Details */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-200">Overview</h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {movie.overview || "No overview available for this title."}
                  </p>
                </div>
                
                {movie.genres && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-200">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((genre: any) => (
                        <Badge key={genre.id} variant="secondary" className="bg-blue-600/20 text-blue-400 px-3 py-1">
                          {genre.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Video Player Section */}
            <div className="mt-12" id="movie-iframe">
              <h3 className="text-2xl font-bold mb-6 text-white">Watch Preview</h3>
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1"
                  title="Movie Preview"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-gray-400 text-sm mt-3">
                * This is a preview. Full movie streaming requires subscription.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovieModal;
