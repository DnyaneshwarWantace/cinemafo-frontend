import React, { useState, useEffect } from 'react';
import { Search, Home, Film, Tv, X, Calendar, Bookmark, Menu, Star } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { Movie, TVShow } from '@/services/api';
import useAdminSettings from '@/hooks/useAdminSettings';

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
  const [searchResults, setSearchResults] = useState<(Movie | TVShow)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);

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
    // Do nothing - we don't want form submission to navigate
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Do nothing - we don't want Enter to navigate
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Get admin settings for Discord link
  const { settings: adminSettings } = useAdminSettings();
  const discordLink = adminSettings?.appearance?.floatingSocialButtons?.discordUrl || 'https://discord.gg/cinema-fo';

  // Search functionality with debounce
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    console.log('🔍 Search triggered:', query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.trim().length < 2) {
      console.log('❌ Query too short, hiding popup');
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchPopup(false);
      return;
    }

    // Set a new timeout for debounced search
    const timeout = setTimeout(async () => {
      console.log('✅ Making API call for:', query);
      setIsSearching(true);
      setShowSearchPopup(true);
      try {
        const response = await api.search(query);
        console.log('📡 API Response:', response);
        console.log('📋 Results:', response.data?.results?.length || 0);
        setSearchResults(response.data?.results || []);
      } catch (error) {
        console.error('❌ Error searching:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms delay

    setSearchTimeout(timeout);
  };

  const handleSearchItemClick = (item: Movie | TVShow) => {
    // Close search popup and clear search
    setShowSearchPopup(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // Navigate to search page with the query
    const title = 'title' in item ? item.title : item.name;
    navigate(`/search?q=${encodeURIComponent(title)}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchPopup(false);
  };



  // Debug popup state
  useEffect(() => {
    console.log('🎯 Popup state changed:', { showSearchPopup, searchQuery, searchResultsLength: searchResults.length, isSearching });
  }, [showSearchPopup, searchQuery, searchResults.length, isSearching]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSearchPopup(false);
      }
    };

    if (showSearchPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchPopup]);

  return (
    <>
      <nav className={`fixed left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-gray-800/30 transition-all duration-300 h-[80px] ${
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
              <div className="relative search-container">
                <form onSubmit={handleSearchSubmit}>
                  <div className={`flex items-center transition-all duration-300 ${
                    isSearchFocused ? 'w-80' : 'w-64'
                  }`}>
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search movies..."
                        className="w-full bg-white/10 text-white pl-10 pr-10 py-2.5 rounded-full border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400 transition-all duration-300 focus:bg-white/15"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                                {/* Desktop Search Popup */}
                {showSearchPopup && (
                  <div className="absolute top-full left-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50 w-full">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        <div className="p-2 max-h-64 overflow-y-auto scrollbar-hide">
                          {searchResults.slice(0, 4).map((item) => {
                            const title = 'title' in item ? item.title : item.name;
                            const releaseDate = 'release_date' in item ? item.release_date : item.first_air_date;
                            const isMovie = 'title' in item;
                            
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleSearchItemClick(item)}
                                className="flex items-center gap-3 p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors group"
                              >
                                {/* Poster */}
                                <div className="flex-shrink-0 w-12 h-16 bg-gray-700 rounded overflow-hidden">
                                  <img
                                    src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                    alt={title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/92x138/666666/ffffff?text=No+Image';
                                    }}
                                  />
                                </div>
                                
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-medium truncate text-sm">{title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <span>{releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown'}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-400" />
                                      {item.vote_average?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize">{isMovie ? 'Movie' : 'TV Show'}</span>
                                  </div>
                                  {item.overview && (
                                    <p className="text-xs text-gray-500 truncate mt-1 line-clamp-1">
                                      {item.overview}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* View More Results - Always visible */}
                        {searchResults.length > 3 && (
                          <div
                            onClick={() => {
                              setShowSearchPopup(false);
                              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                            }}
                            className="p-3 text-center text-blue-400 hover:text-blue-300 cursor-pointer border-t border-gray-700/50"
                          >
                            View all {searchResults.length} results →
                          </div>
                        )}
                      </div>
                    ) : searchQuery && !isSearching ? (
                      <div className="p-4 text-center text-gray-400">
                        No results found for "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Discord Button - Right side */}
            <div className="hidden md:flex items-center">
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white p-3 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className="transition-colors duration-300"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium">Discord</span>
              </a>
            </div>

            {/* Mobile menu button and Discord */}
            <div className="md:hidden flex items-center gap-2">
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className="transition-colors duration-300"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
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
          <div className={`absolute right-0 w-64 bg-black backdrop-blur-xl ${
            isAnnouncementEnabled && !inModalView && !isScrolled ? 'top-[48px] h-[calc(100vh-48px)]' : 'top-0 h-full'
          }`}>
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
              <div className="mb-6 relative">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search movies..."
                      className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </form>

                {/* Mobile Search Popup */}
                {showSearchPopup && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-2">
                        {searchResults.slice(0, 3).map((item) => {
                          const title = 'title' in item ? item.title : item.name;
                          const releaseDate = 'release_date' in item ? item.release_date : item.first_air_date;
                          const isMovie = 'title' in item;
                          
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleSearchItemClick(item)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors group"
                            >
                              {/* Poster */}
                              <div className="flex-shrink-0 w-12 h-16 bg-gray-700 rounded overflow-hidden">
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/92x138/666666/ffffff?text=No+Image';
                                  }}
                                />
                              </div>
                              
                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate text-sm">{title}</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                  {releaseDate ? new Date(releaseDate).getFullYear() : 'Unknown'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* View More Results */}
                        {searchResults.length > 8 && (
                          <div
                            onClick={() => {
                              setShowSearchPopup(false);
                              navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                            }}
                            className="p-3 text-center text-blue-400 hover:text-blue-300 cursor-pointer border-t border-gray-700/50 mt-2"
                          >
                            View all {searchResults.length} results →
                          </div>
                        )}
                      </div>
                    ) : searchQuery && !isSearching ? (
                      <div className="p-4 text-center text-gray-400">
                        No results found for "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                )}
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
