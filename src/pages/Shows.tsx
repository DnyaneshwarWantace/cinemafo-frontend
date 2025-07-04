import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import HeroSlider from '@/components/HeroSlider';
import MovieCarousel from '@/components/MovieCarousel';
import api, { TVShow } from '@/services/api';
import { Loader2 } from 'lucide-react';
import TVShowPlayer from "@/components/TVShowPlayer";

const Shows = () => {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [genresResponse, showsResponse] = await Promise.all([
          api.getTVGenres(),
          api.getPopularShows()
        ]);
        setGenres(genresResponse.data?.genres || []);
        setShows(showsResponse.data?.results || []);
      } catch (err) {
        setError('Failed to load TV shows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchShowsByGenre = async () => {
      if (selectedGenre === null) return;
      try {
        setLoading(true);
        const response = await api.getShowsByGenre(selectedGenre);
        setShows(response.data?.results || []);
      } catch (err) {
        setError('Failed to load TV shows');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShowsByGenre();
  }, [selectedGenre]);

  const handleGenreClick = (genreId: number) => {
    setSelectedGenre(genreId === selectedGenre ? null : genreId);
  };

  const handleShowClick = (item: TVShow) => {
    setSelectedShow(item);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSlider 
        items={shows.slice(0, 5)} 
        onItemClick={handleShowClick}
      />

      {/* Genre Filter */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {genres?.map((genre) => (
            <Button
              key={genre.id}
              variant={selectedGenre === genre.id ? "default" : "secondary"}
              onClick={() => handleGenreClick(genre.id)}
              className="rounded-full"
            >
              {genre.name}
            </Button>
          ))}
        </div>

        {/* Shows Carousel */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <MovieCarousel
            title={selectedGenre ? `${genres.find(g => g.id === selectedGenre)?.name} Shows` : "Popular TV Shows"}
            items={shows}
            onItemClick={handleShowClick}
          />
        )}
      </div>

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

export default Shows; 