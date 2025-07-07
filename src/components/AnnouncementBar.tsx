import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';

const AnnouncementBar: React.FC = () => {
  const { settings } = useAdmin();

  if (!settings.showAnnouncementBar || !settings.announcementText) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 border-b border-blue-500/50">
      <div className="px-4 py-2">
        <p className="text-white text-center text-sm font-medium">
          {settings.announcementText}
        </p>
      </div>
    </div>
  );
};

export default AnnouncementBar;