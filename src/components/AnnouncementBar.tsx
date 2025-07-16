import React from 'react';
import { X } from 'lucide-react';
import useAdminSettings from '@/hooks/useAdminSettings';

const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = React.useState(true);
  const { settings: adminSettings } = useAdminSettings();

  // Default values for better UX
  const isEnabled = adminSettings?.appearance?.announcementBar?.enabled ?? false;
  const text = adminSettings?.appearance?.announcementBar?.text || 'Welcome to CINEMA.FO - Your ultimate streaming destination!';
  const backgroundColor = adminSettings?.appearance?.announcementBar?.backgroundColor || '#1e40af';
  const textColor = adminSettings?.appearance?.announcementBar?.textColor || '#ffffff';

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('announcementClosed', 'true');
    // Dispatch event to notify navbar
    window.dispatchEvent(new Event('announcementClosed'));
  };

  if (!isEnabled || !text || !isVisible) {
    return null;
  }

  return (
    <div 
      className="text-center shadow-lg h-[48px] flex items-center"
      style={{ 
        backgroundColor,
        background: `linear-gradient(135deg, ${backgroundColor}ee, ${backgroundColor}cc)`,
        borderBottom: `2px solid ${backgroundColor}66`
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
      
      {/* Bottom gradient border */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${backgroundColor}aa, transparent)`
        }}
      ></div>
    </div>
  );
};

export default AnnouncementBar; 