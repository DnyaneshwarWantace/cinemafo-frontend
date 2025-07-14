import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '@/services/api';

interface AdBannerProps {
  adKey: string;
  className?: string;
}

interface AdConfig {
  enabled: boolean;
  imageUrl: string;
  clickUrl: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ 
  adKey, 
  className = ''
}) => {
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    setDebugMode(window.location.search.includes('debug=true'));
    
    console.log(`[AdBanner ${adKey}] Loading...`);
    
    // Fetch settings from API
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`[AdBanner ${adKey}] Fetching settings...`);
        
        // Force a fresh fetch by adding timestamp
        const settings = await api.settings.getPublicSettings();
        console.log(`[AdBanner ${adKey}] Fetched settings:`, settings);
        
        if (!settings) {
          throw new Error('No settings returned from API');
        }

        if (!settings.ads) {
          throw new Error('No ads configuration in settings');
        }
        
          const adSettings = settings.ads?.[adKey];
          console.log(`[AdBanner ${adKey}] Ad settings for ${adKey}:`, adSettings);
        
        if (!adSettings) {
          throw new Error(`No configuration found for ad: ${adKey}`);
        }

        if (!adSettings.enabled) {
          throw new Error(`Ad is disabled: ${adKey}`);
        }

        if (!adSettings.imageUrl) {
          throw new Error(`No image URL configured for ad: ${adKey}`);
        }

        setAdConfig(adSettings);
        setError(null);
        console.log(`[AdBanner ${adKey}] SUCCESSFULLY CONFIGURED AD:`, adSettings);
      } catch (error) {
        console.error(`[AdBanner ${adKey}] Error:`, error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setAdConfig(null);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSettings();

    // Refresh settings more frequently for debugging
    const refreshInterval = setInterval(fetchSettings, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [adKey]);

  // Show loading state
  if (loading) {
    if (debugMode) {
      return (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Loading Ad ({adKey})...</strong>
        </div>
      );
    }
    return null;
  }

  // Show error state
  if (error) {
    if (debugMode) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Ad Error ({adKey}): </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      );
    }
    return null;
  }

  // Don't render if no valid ad config or ad is closed
  if (!adConfig || !isVisible) {
    return null;
  }

  const handleAdClick = () => {
    if (adConfig.clickUrl) {
      console.log(`[AdBanner ${adKey}] Ad clicked - opening ${adConfig.clickUrl}`);
      window.open(adConfig.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClickCount(prev => prev + 1);
    
    if (clickCount === 0) {
      // First click - redirect to ad website
      console.log(`[AdBanner ${adKey}] First close click - redirecting to ad website`);
      if (adConfig.clickUrl) {
        window.open(adConfig.clickUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      // Second click - close the ad
      console.log(`[AdBanner ${adKey}] Second close click - closing ad`);
      setIsVisible(false);
    }
  };

  console.log(`[AdBanner ${adKey}] RENDERING AD:`, adConfig);

  return (
    <div className={`ad-banner ${className}`}>
      <div className="relative group">
        {/* Sponsored label */}
        <div className="absolute top-2 left-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded z-10">
          Sponsored
        </div>
        
        {/* Close button */}
        <button
          onClick={handleCloseClick}
          className="absolute top-2 right-2 bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-full p-1 z-10 transition-colors duration-200"
          aria-label="Close ad"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ad image */}
        <div className="cursor-pointer" onClick={handleAdClick}>
        <img
          src={adConfig.imageUrl}
          alt={`Advertisement - ${adKey}`}
            className="w-full h-auto max-h-32 object-cover rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl"
          onError={(e) => {
            console.error(`[AdBanner ${adKey}] Image failed to load`);
            setError(`Failed to load image: ${adConfig.imageUrl}`);
              e.currentTarget.src = `https://via.placeholder.com/400x100/333/fff?text=AD+ERROR`;
          }}
        />
        </div>
        
        {/* Debug info */}
        {debugMode && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {adKey} - Clicks: {clickCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBanner; 