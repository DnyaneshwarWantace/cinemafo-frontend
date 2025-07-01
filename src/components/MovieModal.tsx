
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Star, Calendar, Clock, X } from "lucide-react";

interface MovieModalProps {
  movie: any;
  onClose: () => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose }) => {
  const handleWatchNow = () => {
    // For now, open a random video in iframe as requested
    const randomVideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // Rick Roll as placeholder
    window.open(randomVideoUrl, '_blank');
  };

  return (
    <Dialog open={!!movie} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-bold">
              {movie.title || movie.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Poster */}
          <div className="md:col-span-1">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title || movie.name}
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
          
          {/* Details */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>{movie.vote_average?.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
              </div>
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{movie.runtime} min</span>
                </div>
              )}
            </div>
            
            <p className="text-gray-300 leading-relaxed">
              {movie.overview}
            </p>
            
            {movie.genres && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre: any) => (
                  <Badge key={genre.id} variant="secondary" className="bg-blue-600/20 text-blue-400">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleWatchNow}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Now
              </Button>
            </div>
            
            {/* Iframe Player */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Preview</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Movie Preview"
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovieModal;
