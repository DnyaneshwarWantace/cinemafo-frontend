import { useState, useEffect } from 'react';

interface AdminSettings {
  appearance: {
    announcementBar: {
      enabled: boolean;
      text: string;
      backgroundColor: string;
      textColor: string;
      height: number;
      textSize: string;
      textWeight: string;
      textStyle: string;
    };
    floatingSocialButtons: {
      enabled: boolean;
      discordEnabled: boolean;
      telegramEnabled: boolean;
      discordUrl: string;
      telegramUrl: string;
    };
    customCSS: string;
  };
  content: {
    disclaimer: string;
    aboutUs: string;
    contactEmail: string;
    socialLinks: {
      discord: string;
      telegram: string;
    };
  };
  ads: {
    heroOverlayAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    mainPageAd1: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    mainPageAd2: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    mainPageAd3: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    mainPageAd4: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    searchTopAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    searchBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    moviesPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    moviesPageBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    showsPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    showsPageBottomAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
    playerPageAd: { enabled: boolean; imageUrl: string; cloudinaryUrl: string; clickUrl: string; };
  };
}

const useAdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinema.bz/api/admin'}/public/settings`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const data = await response.json();
        setSettings(data);
        
        // Store in localStorage for offline access
        localStorage.setItem('adminSettings', JSON.stringify(data));
        
        // Apply custom CSS if available
        if (data.appearance?.customCSS) {
          applyCustomCSS(data.appearance.customCSS);
        }
        
      } catch (err) {
        console.error('Error fetching admin settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch settings');
        
        // Try to load from localStorage as fallback
        try {
          const saved = localStorage.getItem('adminSettings');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSettings(parsed);
          }
        } catch (localErr) {
          console.error('Error loading settings from localStorage:', localErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const applyCustomCSS = (css: string) => {
    if (!css) return;
    
    // Remove existing custom CSS
    const existingStyle = document.getElementById('custom-admin-css');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add new custom CSS
    const style = document.createElement('style');
    style.id = 'custom-admin-css';
    style.textContent = css;
    document.head.appendChild(style);
  };

  return {
    settings,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      setError(null);
      // Trigger refetch by updating timestamp
      const timestamp = Date.now();
      fetch(`${import.meta.env.VITE_ADMIN_URL || 'https://cinema.bz/api/admin'}/public/settings?t=${timestamp}`)
        .then(response => response.json())
        .then(data => {
          setSettings(data);
          localStorage.setItem('adminSettings', JSON.stringify(data));
          if (data.appearance?.customCSS) {
            applyCustomCSS(data.appearance.customCSS);
          }
        })
        .catch(err => {
          console.error('Error refetching settings:', err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  };
};

export default useAdminSettings; 