
import React from 'react';
import useAdminSettings from '@/hooks/useAdminSettings';

const Footer = () => {
  const { settings: adminSettings } = useAdminSettings();
  
  // Get content from settings
  const disclaimer = adminSettings?.content?.disclaimer;
  const aboutUs = adminSettings?.content?.aboutUs;
  
  // Get social links from content or fallback to appearance settings, with defaults
  const socialLinks = {
    discord: adminSettings?.content?.socialLinks?.discord || 
             adminSettings?.appearance?.floatingSocialButtons?.discordUrl || 
             'https://discord.gg/cinema-fo',
    telegram: adminSettings?.content?.socialLinks?.telegram || 
              adminSettings?.appearance?.floatingSocialButtons?.telegramUrl || 
              'https://t.me/cinema-fo'
  };

  const handleSocialClick = (url: string, platform: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn(`${platform} URL not configured in admin settings`);
    }
  };

  return (
    <footer className="bg-gradient-to-t from-gray-900 to-black border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Description */}
          <div className="md:col-span-2">
            {/* Logo */}
            <div className="mb-6">
              <img 
                src="/logo.svg" 
                alt="CINEMA.BZ" 
                className="h-12 w-auto"
              />
            </div>
            
            {aboutUs && (
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {aboutUs}
              </p>
            )}
            
            {/* Disclaimer */}
            {disclaimer && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-white font-semibold mb-2">Disclaimer:</h4>
                <p className="text-gray-500 text-xs leading-relaxed">
                  {disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-white font-semibold mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-bold">Home</a></li>
              <li><a href="/search" className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-bold">Search</a></li>
              <li><a href="/movies" className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-bold">Movies</a></li>
              <li><a href="/shows" className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-bold">TV Shows</a></li>
              <li><a href="/watchlist" className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-bold">Watchlist</a></li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-white font-semibold mb-4">Social</h3>
            <div className="space-y-3">
              {/* Discord */}
              <button 
                onClick={() => handleSocialClick(socialLinks.discord, 'Discord')}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 cursor-pointer font-bold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </button>
              
              {/* Telegram */}
                  <button 
                onClick={() => handleSocialClick(socialLinks.telegram, 'Telegram')}
                className="bg-[#0088cc] hover:bg-[#006ba3] text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 cursor-pointer font-bold"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                Telegram
                  </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm font-bold">
            © {new Date().getFullYear()} CINEMA.BZ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
