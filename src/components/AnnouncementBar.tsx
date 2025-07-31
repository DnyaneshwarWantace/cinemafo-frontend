import React from 'react';
import { X } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const AnnouncementBar = () => {
  const [isUserDismissed, setIsUserDismissed] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const { settings: adminSettings } = useAdminSettings();

  // Get values from admin settings
  const isEnabled = adminSettings?.appearance?.announcementBar?.enabled;
  const text = adminSettings?.appearance?.announcementBar?.text;
  const textColor = adminSettings?.appearance?.announcementBar?.textColor || '#ffffff';
  const backgroundColor = adminSettings?.appearance?.announcementBar?.backgroundColor || 'linear-gradient(135deg, #1e40af, #1e3a8a)';
  const height = adminSettings?.appearance?.announcementBar?.height || 48;
  const textSize = adminSettings?.appearance?.announcementBar?.textSize || 'text-sm md:text-base';
  const textWeight = adminSettings?.appearance?.announcementBar?.textWeight || 'font-medium';
  const textStyle = adminSettings?.appearance?.announcementBar?.textStyle || 'normal';

  // Check admin setting and user dismissal on mount
  React.useEffect(() => {
    const userDismissed = localStorage.getItem('announcementUserDismissed') === 'true';
    setIsUserDismissed(userDismissed);
  }, []);

  // Reset user dismissal when admin setting changes
  React.useEffect(() => {
    if (isEnabled && text) {
      // If admin enables announcement, reset user dismissal
      localStorage.removeItem('announcementUserDismissed');
      setIsUserDismissed(false);
    }
  }, [isEnabled, text]);

  // Handle scroll behavior for announcement bar hiding/showing
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show announcement bar when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsHidden(false);
      } 
      // Hide announcement bar when scrolling down and not at the top
      else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHidden(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const handleClose = () => {
    setIsUserDismissed(true);
    localStorage.setItem('announcementUserDismissed', 'true');
    // Dispatch event to notify navbar
    window.dispatchEvent(new Event('announcementClosed'));
  };

  // Show announcement only if admin enabled AND user hasn't dismissed it
  if (!isEnabled || !text || isUserDismissed) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-40 text-center shadow-lg flex items-center transition-transform duration-300 ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ 
        background: backgroundColor,
        height: `${height}px`
      }}
    >
      {/* Gradient overlay for better visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="relative w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <p 
            className={`${textSize} ${textWeight} leading-relaxed`}
            style={{ 
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontStyle: textStyle
            }}
          >
            {text}
          </p>
        <button
          onClick={handleClose}
            className="absolute right-4 hover:text-gray-200 transition-colors"
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