import { useEffect, useState } from 'react';

interface ReferralData {
  code: string;
  source: string;
  campaign?: string;
}

export const useReferralTracking = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);

  useEffect(() => {
    // Check if user came from a referral link
    const checkReferralSource = () => {
      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode) {
        setReferralData({ code: refCode, source: 'direct' });
        return;
      }

      // Check cookies for referral source
      const cookies = document.cookie.split(';');
      const referralCookie = cookies.find(cookie => 
        cookie.trim().startsWith('referral_source=')
      );
      
      if (referralCookie) {
        const code = referralCookie.split('=')[1];
        setReferralData({ code, source: 'cookie' });
      }
    };

    checkReferralSource();
  }, []);

  const trackConversion = async (action: string = 'page_view') => {
    if (!referralData) return;

    try {
      // Track conversion on backend
      await fetch('/api/referral/track-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: referralData.code,
          action,
          timestamp: new Date().toISOString(),
          page: window.location.pathname,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to track referral conversion:', error);
    }
  };

  const trackPageView = () => {
    trackConversion('page_view');
  };

  const trackVideoPlay = () => {
    trackConversion('video_play');
  };

  const trackSearch = () => {
    trackConversion('search');
  };

  const trackWatchlistAdd = () => {
    trackConversion('watchlist_add');
  };

  return {
    referralData,
    trackConversion,
    trackPageView,
    trackVideoPlay,
    trackSearch,
    trackWatchlistAdd
  };
};
