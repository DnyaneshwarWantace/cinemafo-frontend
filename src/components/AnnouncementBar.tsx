import React from 'react';
import { X } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { settings: adminSettings } = useAdminSettings();

  // Default values for better UX
  const isEnabled = adminSettings?.appearance?.announcementBar?.enabled ?? true;
  const text = adminSettings?.appearance?.announcementBar?.text || 'Welcome to CINEMA.FO - Your ultimate streaming destination!';
  const backgroundColor = adminSettings?.appearance?.announcementBar?.backgroundColor || '#1e40af';
  const textColor = adminSettings?.appearance?.announcementBar?.textColor || '#ffffff';

  // Handle scroll to show/hide announcement bar
  React.useEffect(() => {
    const handleScroll = () => {
      const announcementClosed = localStorage.getItem('announcementClosed') === 'true';
      if (!announcementClosed) {
        // Only show announcement when not manually closed and at top
        const shouldShow = window.scrollY <= 48;
        setIsScrolled(!shouldShow);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for manual close
  React.useEffect(() => {
    const handleAnnouncementClosed = () => {
      setIsVisible(false);
    };

    const handleStorageChange = () => {
      const announcementClosed = localStorage.getItem('announcementClosed');
      if (announcementClosed === 'true') {
        setIsVisible(false);
      } else {
        // Check if we should show based on scroll position
        const shouldShow = window.scrollY <= 48;
        setIsVisible(shouldShow);
        setIsScrolled(!shouldShow);
      }
    };

    window.addEventListener('announcementClosed', handleAnnouncementClosed);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('announcementClosed', handleAnnouncementClosed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('announcementClosed', 'true');
    // Dispatch event to notify navbar
    window.dispatchEvent(new Event('announcementClosed'));
  };

  // Don't render if disabled, no text, or manually closed
  if (!isEnabled || !text || !isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 text-center shadow-lg h-[48px] flex items-center navbar-transition ${
        isScrolled ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
      style={{ 
        backgroundColor,
        background: `linear-gradient(135deg, ${backgroundColor}ee, ${backgroundColor}cc)`
      }}
    >
      {/* Gradient overlay for better visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="relative w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <p 
            className="text-sm md:text-base font-medium leading-relaxed"
            style={{ 
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {text}
          </p>
        <button
          onClick={handleClose}
            className="absolute right-4 text-white hover:text-gray-200 transition-colors"
            style={{ color: textColor }}
        >
            <X size={16} />
        </button>
        </div>
      </div>
      
    </div>
  );
};

export default AnnouncementBar; 