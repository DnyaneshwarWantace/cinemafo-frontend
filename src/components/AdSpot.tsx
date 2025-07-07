import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';

interface AdSpotProps {
  adKey: string;
  className?: string;
}

const AdSpot: React.FC<AdSpotProps> = ({ adKey, className = '' }) => {
  const { settings } = useAdmin();
  const ad = settings.ads[adKey as keyof typeof settings.ads];

  if (!ad || !ad.enabled || !ad.imageUrl) {
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
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 cursor-pointer hover:border-blue-500/50 transition-all duration-300 group"
        onClick={handleAdClick}
      >
        <div className="text-xs text-gray-400 mb-2 text-center">Advertisement</div>
        <img
          src={ad.imageUrl}
          alt="Advertisement"
          className="max-w-full h-auto rounded-md group-hover:scale-105 transition-transform duration-300"
          style={{ maxHeight: '200px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};

export default AdSpot;