import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MovieCarouselSkeletonProps {
  title?: string;
  itemCount?: number;
}

const MovieCarouselSkeleton: React.FC<MovieCarouselSkeletonProps> = ({ 
  title = "Loading...", 
  itemCount = 6 
}) => {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MovieCarouselSkeleton; 