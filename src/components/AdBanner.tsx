import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdBannerProps {
  adKey: string;
  imageUrl: string;
  cloudinaryUrl?: string;
  clickUrl: string;
  enabled: boolean;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ 
  adKey, 
  imageUrl, 
  cloudinaryUrl,
  clickUrl, 
  enabled, 
  className = '' 
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (!enabled || !imageUrl || !clickUrl) {
      return;
    }

    // Generate or get session ID
    let currentSessionId = sessionStorage.getItem('ad_session_id');
    if (!currentSessionId) {
      currentSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('ad_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);

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

  const handleAdClick = async () => {
    try {
      // Track click locally
      const sessionKey = `ad_clicked_${adKey}`;
      sessionStorage.setItem(sessionKey, 'true');
      setClickCount(1);

      // Send click data to backend for tracking
      const trackAdClick = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://cinemafo.lol//api'}/admin/public/track-ad-click`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              adKey,
              clickUrl,
              pageUrl: window.location.href,
              sessionId,
              deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 
                         /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
              browser: getBrowserName(),
              os: getOSName()
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[AdBanner ${adKey}] Click tracked successfully:`, data);
          } else {
            console.warn(`[AdBanner ${adKey}] Failed to track click:`, response.status);
          }
        } catch (trackError) {
          console.error(`[AdBanner ${adKey}] Error tracking click:`, trackError);
        }
      };

      // Track click in background (don't wait for it)
      trackAdClick();

      // Open ad URL in new tab
      window.open(clickUrl, '_blank', 'noopener,noreferrer');
      
      console.log(`[AdBanner ${adKey}] Ad clicked, redirecting to: ${clickUrl}`);
    } catch (error) {
      console.error(`[AdBanner ${adKey}] Error handling ad click:`, error);
      setError('Failed to open ad link');
    }
  };

  // Helper function to detect browser
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  };

  // Helper function to detect OS
  const getOSName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
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
        className="cursor-pointer relative overflow-hidden w-full"
        onClick={handleAdClick}
        title="Click to visit advertiser"
      >
        <img
          src={cloudinaryUrl || imageUrl}
          alt="Advertisement"
          className="w-full h-auto max-h-48 object-contain shadow-md transition-all duration-300 hover:shadow-lg"
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