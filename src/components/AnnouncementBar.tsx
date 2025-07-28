import React from 'react';
import { X } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const AnnouncementBar = () => {
  const [isUserDismissed, setIsUserDismissed] = React.useState(false);
  const { settings: adminSettings } = useAdminSettings();

  // Get values from admin settings
  const isEnabled = adminSettings?.appearance?.announcementBar?.enabled;
  const text = adminSettings?.appearance?.announcementBar?.text;
  const textColor = adminSettings?.appearance?.announcementBar?.textColor || '#ffffff';

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
      className="fixed top-0 left-0 right-0 z-40 text-center shadow-lg h-[48px] flex items-center"
      style={{ 
        background: "linear-gradient(135deg, #1e40af, #1e3a8a)"
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