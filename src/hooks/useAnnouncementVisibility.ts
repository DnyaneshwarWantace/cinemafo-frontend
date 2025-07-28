import { useState, useEffect } from 'react';
import useAdminSettings from './useAdminSettings';

export const useAnnouncementVisibility = () => {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);
  const { settings: adminSettings } = useAdminSettings();

  useEffect(() => {
    // Wait for admin settings to load before determining announcement visibility
    if (adminSettings) {
      const isEnabled = adminSettings?.appearance?.announcementBar?.enabled;
      const text = adminSettings?.appearance?.announcementBar?.text;
      const announcementClosed = localStorage.getItem('announcementUserDismissed') === 'true';
      
      // Only show announcement if admin enabled, has text, and user hasn't dismissed
      const shouldShow = isEnabled && text && !announcementClosed;
      setIsAnnouncementVisible(shouldShow);
    }
  }, [adminSettings]);

  // Listen for announcement bar close
  useEffect(() => {
    const handleAnnouncementClosed = () => {
      setIsAnnouncementVisible(false);
    };

    const handleStorageChange = () => {
      const announcementClosed = localStorage.getItem('announcementUserDismissed');
      setIsAnnouncementVisible(announcementClosed !== 'true');
    };

    window.addEventListener('announcementClosed', handleAnnouncementClosed);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('announcementClosed', handleAnnouncementClosed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return isAnnouncementVisible;
}; 