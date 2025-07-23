
import React from 'react';
import useAdminSettings from '@/hooks/useAdminSettings';

const Footer = () => {
  const { settings: adminSettings } = useAdminSettings();
  
  // Get content from settings
  const disclaimer = adminSettings?.content?.disclaimer;
  const aboutUs = adminSettings?.content?.aboutUs;
  const contactEmail = adminSettings?.content?.contactEmail;

  const handleContactClick = () => {
    if (contactEmail) {
      window.open(`mailto:${contactEmail}`, '_blank');
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
                alt="CINEMA.FO" 
                className="h-12 w-auto"
              />
            </div>
            
            {aboutUs && (
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {aboutUs}
              </p>
            )}
            
            {/* Disclaimer */}
            {disclaimer && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <h4 className="text-white font-semibold mb-2">Disclaimer:</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</a></li>
              <li><a href="/movies" className="text-gray-400 hover:text-white transition-colors text-sm">Movies</a></li>
              <li><a href="/shows" className="text-gray-400 hover:text-white transition-colors text-sm">TV Shows</a></li>
              <li><a href="/search" className="text-gray-400 hover:text-white transition-colors text-sm">Search</a></li>
              <li><a href="/watchlist" className="text-gray-400 hover:text-white transition-colors text-sm">Watchlist</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {contactEmail && (
                <li>
                  <button 
                    onClick={handleContactClick}
                    className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 13.5l8-5V7l-8 5-8-5v1.5l8 5z"/>
                      <path d="M3 6h18v12H3V6zm0-1v14h18V5H3z"/>
                    </svg>
                    Contact Us
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} CINEMA.FO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
