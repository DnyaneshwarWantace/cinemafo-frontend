import { useState, useEffect } from 'react';

export const useNavbarSpacing = () => {
  const [topSpacing, setTopSpacing] = useState('128px'); // Default with announcement bar

  useEffect(() => {
    const updateSpacing = () => {
      const announcementClosed = localStorage.getItem('announcementClosed') === 'true';
      const shouldShowAnnouncement = window.scrollY <= 48;
      
      if (announcementClosed || !shouldShowAnnouncement) {
        setTopSpacing('80px'); // Just navbar height
      } else {
        setTopSpacing('128px'); // Navbar + announcement bar height
      }
    };

    const handleScroll = () => {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(updateSpacing);
    };

    const handleAnnouncementClosed = () => {
      setTopSpacing('80px');
    };

    const handleStorageChange = () => {
      updateSpacing();
    };

    // Initial check
    updateSpacing();

    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('announcementClosed', handleAnnouncementClosed);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('announcementClosed', handleAnnouncementClosed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return topSpacing;
}; 