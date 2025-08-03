import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdBannerProps {
  adKey: string;
  imageUrl: string;
  clickUrl: string;
  enabled: boolean;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ 
  adKey, 
  imageUrl, 
  clickUrl, 
  enabled, 
  className = '' 
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !imageUrl || !clickUrl) {
      return;
    }

    // Check if user has already clicked this ad in this session
    const sessionKey = `ad_clicked_${adKey}`;
    const hasClicked = sessionStorage.getItem(sessionKey);
    if (hasClicked) {
      setClickCount(1);
    }
  }, [enabled, imageUrl, clickUrl, adKey]);

  if (!enabled || !imageUrl || !clickUrl) {
    return null;
  }

  const handleAdClick = () => {
    try {
      // Track click
      const sessionKey = `ad_clicked_${adKey}`;
      sessionStorage.setItem(sessionKey, 'true');
      setClickCount(1);

      // Open ad URL in new tab
      window.open(clickUrl, '_blank', 'noopener,noreferrer');
      
      console.log(`[AdBanner ${adKey}] Ad clicked, redirecting to: ${clickUrl}`);
    } catch (error) {
      console.error(`[AdBanner ${adKey}] Error handling ad click:`, error);
      setError('Failed to open ad link');
    }
  };

  if (error) {
    return (
      <div className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative ${className}`} role="alert">
        <span className="block sm:inline">Ad failed to load: {error}</span>
      </div>
    );
  }

  return (
    <div className={`relative max-w-md mx-auto ${className}`}>
      {/* Sponsored label */}
      <div className="absolute top-1 left-1 z-10">
        <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
          Sponsored
        </span>
      </div>

      {/* Ad image */}
      <div 
        className="cursor-pointer relative overflow-hidden rounded-lg w-full"
        onClick={handleAdClick}
        title="Click to visit advertiser"
      >
        <img
          src={imageUrl}
          alt="Advertisement"
          className="w-full h-auto max-h-48 object-contain rounded-lg shadow-md transition-all duration-300 hover:shadow-lg"
          onError={() => setError('Failed to load ad image')}
          loading="lazy"
        />
        
        {/* Click overlay */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
          {clickCount === 0 && (
            <div className="bg-white/90 text-black px-2 py-0.5 rounded-full text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">
              Click to visit
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdBanner; 