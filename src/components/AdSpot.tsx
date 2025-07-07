import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';

interface AdSpotProps {
  adKey: string;
  className?: string;
}

const AdSpot: React.FC<AdSpotProps> = ({ adKey, className = '' }) => {
  const { settings } = useAdmin();
  const ad = settings.ads[adKey as keyof typeof settings.ads];

  console.log(`AdSpot ${adKey}:`, ad, 'Settings:', settings); // Debug log

  // Force show ads for testing - remove the null return temporarily
  if (!ad) {
    console.log(`AdSpot ${adKey} - no ad config found`);
    return null;
  }

  if (!ad.enabled) {
    console.log(`AdSpot ${adKey} - ad disabled`);
    return null;
  }

  if (!ad.imageUrl) {
    console.log(`AdSpot ${adKey} - no image URL`);
    return null;
  }

  const handleAdClick = () => {
    if (ad.clickUrl) {
      window.open(ad.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`flex justify-center my-8 ${className}`}>
      <div 
        className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 cursor-pointer hover:border-blue-400/40 transition-all duration-300 group shadow-xl hover:shadow-2xl max-w-2xl w-full"
        onClick={handleAdClick}
      >
        {/* Ad Label */}
        <div className="absolute top-2 left-2 text-xs text-gray-400 bg-gray-900/70 px-2 py-1 rounded-full border border-gray-600/50">
          Sponsored
        </div>
        
        {/* Ad Content */}
        <div className="relative overflow-hidden rounded-lg">
          <img
            src={ad.imageUrl}
            alt="Advertisement"
            className="w-full h-auto max-h-48 object-cover rounded-lg group-hover:scale-105 transition-all duration-500 ease-out"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Click Indicator */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-blue-600/90 text-white text-xs px-3 py-1 rounded-full font-medium">
              Learn More →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdSpot;