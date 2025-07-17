import React, { useState, useEffect } from 'react';
import { Search, Home, Film, Tv, X, Calendar, Bookmark, Menu } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface NavigationProps {
  inModalView?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ inModalView = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if announcement bar is enabled (simplified)
  const isAnnouncementEnabled = true;

  useEffect(() => {
    const handleScroll = () => {
      const announcementClosed = localStorage.getItem('announcementClosed') === 'true';
      if (announcementClosed) {
        setIsScrolled(true); // Always at top when announcement is manually closed
      } else {
        // When announcement is not manually closed, show/hide based on scroll
        const shouldShowAnnouncement = window.scrollY <= 48;
        setIsScrolled(!shouldShowAnnouncement);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for announcement bar close
  useEffect(() => {
    const handleAnnouncementClosed = () => {
      // When announcement is manually closed, always keep navbar at top
      setIsScrolled(true);
    };

    const handleStorageChange = () => {
      const announcementClosed = localStorage.getItem('announcementClosed');
      if (announcementClosed === 'true') {
        // When announcement is manually closed, always keep navbar at top
        setIsScrolled(true);
      } else {
        // When announcement is re-enabled, check current scroll position
        const shouldShowAnnouncement = window.scrollY <= 48;
        setIsScrolled(!shouldShowAnnouncement);
      }
    };

    window.addEventListener('announcementClosed', handleAnnouncementClosed);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('announcementClosed', handleAnnouncementClosed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'Shows', path: '/shows', icon: Tv },
    { name: 'Watchlist', path: '/watchlist', icon: Bookmark },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className={`fixed left-0 right-0 z-50 bg-black backdrop-blur-xl transition-all duration-150 h-[80px] ${
        isAnnouncementEnabled && !inModalView && !isScrolled ? 'top-[48px]' : 'top-0'
      }`}>
        <div className="w-full h-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-full">
            {/* Logo - Left corner */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 group">
              <img 
                src="/logo.svg" 
                  alt="CINEMA.FO" 
                  className="h-8 sm:h-10 md:h-12 w-auto transition-all duration-300 group-hover:scale-105 filter group-hover:brightness-110"
              />
              </Link>
            </div>

            {/* Navigation Items and Search - Center */}
            <div className="hidden md:flex items-center space-x-8 flex-1 justify-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Search Bar - Centered with navigation */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className={`flex items-center transition-all duration-300 ${
                  isSearchFocused ? 'w-80' : 'w-64'
                }`}>
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search movies..."
                      className="w-full bg-white/10 backdrop-blur-sm text-white pl-10 pr-10 py-2.5 rounded-full border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400 transition-all duration-300 focus:bg-white/15"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Empty space on right to balance layout */}
            <div className="hidden md:flex items-center w-32">
              {/* This div takes up the same space as the logo to keep everything centered */}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={handleMobileMenuToggle}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
            >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

        {/* Mobile Menu */}
          <div className="absolute top-0 right-0 w-64 h-full bg-gray-900/95 backdrop-blur-xl">
            <div className="p-6">
              {/* Close button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="mb-6">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search movies..."
                      className="w-full bg-white/10 backdrop-blur-sm text-white pl-10 pr-4 py-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Mobile Navigation Items */}
              <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                return (
                    <button
                      key={item.name}
                      onClick={() => handleMobileNavClick(item.path)}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-3 hover:scale-105 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                      <Icon size={18} />
                    {item.name}
                    </button>
                );
              })}
              </div>
            </div>
            </div>
          </div>
        )}
    </>
  );
};

export default Navigation;
