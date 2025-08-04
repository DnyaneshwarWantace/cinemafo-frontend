import { useState, useEffect } from 'react';
import { Movie, TVShow } from '@/services/api';

export interface WatchHistoryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string;
  backdrop_path?: string;
  currentTime: number;
  duration: number;
  progress: number; // percentage (0-100)
  lastWatched: number; // timestamp
  season?: number;
  episode?: number;
  episodeTitle?: string;
  thumbnailTime?: number; // timestamp for thumbnail generation
  thumbnailDataUrl?: string; // base64 thumbnail data
}

export const useWatchHistory = () => {
  // Load watch history from localStorage immediately on mount
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('watchHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading watch history:', error);
    }
    return [];
  });

  // Save watch history to localStorage whenever it changes - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        // Create a clean version without circular references
        const cleanHistory = watchHistory.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          currentTime: item.currentTime,
          duration: item.duration,
          progress: item.progress,
          lastWatched: item.lastWatched,
          season: item.season,
          episode: item.episode,
          episodeTitle: item.episodeTitle,
          thumbnailTime: item.thumbnailTime,
          thumbnailDataUrl: item.thumbnailDataUrl
        }));
        
        localStorage.setItem('watchHistory', JSON.stringify(cleanHistory));
      } catch (error) {
        console.error('Error saving watch history:', error);
      }
    }, 100); // Debounce saves to prevent excessive localStorage writes

    return () => clearTimeout(timeoutId);
  }, [watchHistory]);

  // Generate thumbnail from video element
  const generateThumbnail = async (videoElement: HTMLVideoElement, time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎬 Generating thumbnail for time:', time);
        console.log('🎬 Video element ready state:', videoElement.readyState);
        console.log('🎬 Video current time:', videoElement.currentTime);
        console.log('🎬 Video duration:', videoElement.duration);
        
        // Check if video is ready
        if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA
          console.log('🎬 Video not ready, using current frame');
          // Try to capture current frame without seeking
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Set canvas size to match video
            canvas.width = videoElement.videoWidth || 640;
            canvas.height = videoElement.videoHeight || 360;

            // Draw the video frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to base64 data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            console.log('🎬 Thumbnail generated from current frame');
            resolve(dataUrl);
            return;
          } catch (error) {
            console.warn('🎬 Failed to capture current frame:', error);
            reject(error);
            return;
          }
        }

        // Check if the time difference is small (within 2 seconds), use current frame
        const timeDiff = Math.abs(videoElement.currentTime - time);
        if (timeDiff < 2) {
          console.log('🎬 Time difference is small, using current frame');
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Set canvas size to match video
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            // Draw the video frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to base64 data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            console.log('🎬 Thumbnail generated from current frame (small time diff)');
            resolve(dataUrl);
            return;
          } catch (error) {
            console.warn('🎬 Failed to capture current frame:', error);
            reject(error);
            return;
          }
        }

        // Set video to the specific time
        videoElement.currentTime = time;
        
        // Wait for the video to seek to the time
        const onSeeked = () => {
          try {
            console.log('🎬 Video seeked to time:', videoElement.currentTime);
            
            // Create canvas to capture the frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Set canvas size to match video
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            // Draw the video frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to base64 data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Clean up
            videoElement.removeEventListener('seeked', onSeeked);
            videoElement.removeEventListener('error', onError);
            
            console.log('🎬 Thumbnail generated successfully');
            resolve(dataUrl);
          } catch (error) {
            console.error('🎬 Error generating thumbnail:', error);
            reject(error);
          }
        };

        const onError = () => {
          console.error('🎬 Video seek error');
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          reject(new Error('Video seek failed'));
        };

        videoElement.addEventListener('seeked', onSeeked);
        videoElement.addEventListener('error', onError);

        // Set a shorter timeout in case the seek takes too long
        setTimeout(() => {
          console.warn('🎬 Video seek timeout, trying current frame as fallback');
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          
          // Try to capture current frame as fallback
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            // Set canvas size to match video
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            // Draw the video frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Convert to base64 data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            console.log('🎬 Thumbnail generated from current frame (timeout fallback)');
            resolve(dataUrl);
          } catch (error) {
            console.error('🎬 Failed to capture current frame as fallback:', error);
            reject(new Error('Video seek timeout and fallback failed'));
          }
        }, 2000); // Reduced timeout to 2 seconds

      } catch (error) {
        console.error('🎬 Error in generateThumbnail:', error);
        reject(error);
      }
    });
  };

  const updateProgress = async (
    item: Movie | TVShow,
    currentTime: number,
    duration: number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number,
    episodeTitle?: string,
    videoElement?: HTMLVideoElement
  ) => {

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Only save if watched for more than 10 seconds and less than 90% complete
    if (currentTime > 10 && progress < 90) {
      let thumbnailDataUrl: string | undefined;

      // Always generate thumbnail if video element is provided (final screenshot on close)
      if (videoElement) {
        console.log('🎬 Video element provided, generating thumbnail...');
        try {
          thumbnailDataUrl = await generateThumbnail(videoElement, currentTime);
          console.log('🎬 Thumbnail generated:', !!thumbnailDataUrl);
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }
      } else {
        console.log('🎬 No video element provided, skipping thumbnail');
      }

      const historyItem: WatchHistoryItem = {
        id: item.id,
        type,
        title: 'title' in item ? item.title : item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        currentTime,
        duration,
        progress,
        lastWatched: Date.now(),
        season,
        episode,
        episodeTitle,
        thumbnailTime: currentTime,
        thumbnailDataUrl
      };

      // Debug logging for TV shows
      if (type === 'tv') {
        console.log('🎬 Saving TV show progress:', {
          id: item.id,
          title: historyItem.title,
          season,
          episode,
          currentTime,
          duration
        });
      }

      setWatchHistory(prev => {
        // Ensure prev is an array to prevent state corruption
        if (!Array.isArray(prev)) {
          console.warn('🎬 Watch history state corrupted, resetting to empty array');
          return [historyItem];
        }

        const existingIndex = prev.findIndex(
          h => h.id === item.id && h.type === type && h.season === season && h.episode === episode
        );

        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prev];
          updated[existingIndex] = historyItem;
          return updated;
        } else {
          // Add new item
          const newHistory = [historyItem, ...prev];
          return newHistory;
        }
      });
    } else if (progress >= 90) {
      // Remove from history if watched more than 90%
      removeFromHistory(item.id, type, season, episode);
    }
  };

  const removeFromHistory = (id: number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    setWatchHistory(prev => {
      // Ensure prev is an array to prevent state corruption
      if (!Array.isArray(prev)) {
        console.warn('🎬 Watch history state corrupted, resetting to empty array');
        return [];
      }

      return prev.filter(h => !(h.id === id && h.type === type && h.season === season && h.episode === episode));
    });
  };

  const getHistoryItem = (id: number, type: 'movie' | 'tv', season?: number, episode?: number): WatchHistoryItem | null => {
    if (!Array.isArray(watchHistory)) {
      return null;
    }

    return watchHistory.find(
      h => h.id === id && h.type === type && h.season === season && h.episode === episode
    ) || null;
  };

  const getContinueWatching = (limit: number = 10): WatchHistoryItem[] => {
    if (!Array.isArray(watchHistory)) {
      return [];
    }

    return watchHistory
      .sort((a, b) => b.lastWatched - a.lastWatched)
      .slice(0, limit);
  };

  const clearHistory = () => {
    setWatchHistory([]);
  };

  // Generate a thumbnail URL - prioritize actual screenshots
  const getThumbnailUrl = (item: WatchHistoryItem): string => {
    // First priority: Use actual video screenshot if available
    if (item.thumbnailDataUrl) {
      return item.thumbnailDataUrl;
    }
    
    // Second priority: Use backdrop image for better video-like appearance
    if (item.backdrop_path) {
      return `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
    }
    
    // Fallback: Use poster image
    return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
  };

  // Get the most recent watch history for a specific item
  const getMostRecentHistory = (id: number, type: 'movie' | 'tv'): WatchHistoryItem | null => {
    if (!Array.isArray(watchHistory)) {
      return null;
    }

    const itemHistory = watchHistory.filter(
      h => h.id === id && h.type === type
    );
    
    if (itemHistory.length === 0) return null;
    
    return itemHistory.sort((a, b) => b.lastWatched - a.lastWatched)[0];
  };

  return {
    watchHistory,
    updateProgress,
    removeFromHistory,
    getHistoryItem,
    getContinueWatching,
    clearHistory,
    getThumbnailUrl,
    getMostRecentHistory,
    generateThumbnail
  };
}; 