import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

const Footer = () => {
  const { data: settings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      return await api.settings.getPublicSettings();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Get content from settings without defaults
  const disclaimer = settings?.content?.disclaimer;
  const aboutUs = settings?.content?.aboutUs;
  const contactEmail = settings?.content?.contactEmail;

  console.log('[Footer] Settings:', settings);
  console.log('[Footer] Disclaimer:', disclaimer);
  console.log('[Footer] About Us:', aboutUs);

  return (
    <footer className="bg-gradient-to-t from-gray-900 to-black border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
              CINEMA.FO
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
              <li><a href="/upcoming" className="text-gray-400 hover:text-white transition-colors text-sm">Upcoming</a></li>
              <li><a href="/search" className="text-gray-400 hover:text-white transition-colors text-sm">Search</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {contactEmail && (
                <li>
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 13.5l8-5V7l-8 5-8-5v1.5l8 5z"/>
                      <path d="M3 6h18v12H3V6zm0-1v14h18V5H3z"/>
                    </svg>
                    Contact Us
                  </a>
                </li>
              )}
              <li>
                <a 
                  href="/admin"
                  className="text-gray-500 hover:text-blue-400 transition-colors text-xs flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  Admin Login
                </a>
              </li>
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
