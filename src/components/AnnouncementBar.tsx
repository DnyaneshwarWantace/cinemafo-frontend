import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

const AnnouncementBar = () => {
  const { data: settings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      return await api.settings.getPublicSettings();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  console.log('[AnnouncementBar] Settings:', settings);
  console.log('[AnnouncementBar] Announcement config:', settings?.appearance?.announcementBar);

  // Default values for better UX
  const isEnabled = settings?.appearance?.announcementBar?.enabled ?? true;
  const text = settings?.appearance?.announcementBar?.text || 'Welcome to CINEMA.FO - Your ultimate streaming destination!';
  const backgroundColor = settings?.appearance?.announcementBar?.backgroundColor || '#1e40af';
  const textColor = settings?.appearance?.announcementBar?.textColor || '#ffffff';

  if (!isEnabled || !text) {
    console.log('[AnnouncementBar] Not showing - disabled or no text');
    return null;
  }

  console.log('[AnnouncementBar] Showing announcement with:', { backgroundColor, textColor, text });

  return (
    <div 
      className="relative w-full top-0 left-0 right-0 z-50 shadow-lg"
      style={{ 
        backgroundColor,
        background: `linear-gradient(135deg, ${backgroundColor}ee, ${backgroundColor}cc)`,
        borderBottom: `2px solid ${backgroundColor}66`
      }}
    >
      {/* Gradient overlay for better visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="relative max-w-full mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p 
              className="text-sm md:text-base font-medium leading-relaxed animate-pulse"
              style={{ 
                color: textColor,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {text}
            </p>
          </div>
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