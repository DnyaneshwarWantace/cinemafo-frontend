import React, { useState, useEffect } from 'react';
import { Search, Home, Film, Tv, X, Calendar, Bookmark, Menu, Star } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { Movie, TVShow } from '@/services/api';
import useAdminSettings from '@/hooks/useAdminSettings';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';
import MovieModal from './MovieModal';
import TVShowPlayer from './TVShowPlayer';

interface NavigationProps {
  inModalView?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ inModalView = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<(Movie | TVShow)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShow, setSelectedShow] = useState<TVShow | null>(null);

  // Get admin settings to check announcement bar status
  const { settings: adminSettings } = useAdminSettings();
  
  // Use shared announcement visibility hook
  const isAnnouncementVisible = useAnnouncementVisibility();

  // Calculate navbar top position based on announcement bar visibility and scroll state
  const getNavbarTopPosition = () => {
    if (!isAnnouncementVisible || inModalView) {
      return '0px';
    }
    
    // Check if we should show announcement bar position or move navbar to top
    // We'll use a simple scroll threshold to determine this
    const shouldShowAnnouncementPosition = lastScrollY < 50;
    
    if (shouldShowAnnouncementPosition) {
      return `${adminSettings?.appearance?.announcementBar?.height || 48}px`;
      } else {
      return '0px';
    }
  };

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
      
      // Close mobile menu when Enter is pressed
      setIsMobileMenuOpen(false);
      
      // If there are search results and an item is selected, click that item
      if (searchResults.length > 0 && selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
        handleSearchItemClick(searchResults[selectedSearchIndex]);
      } else if (selectedSearchIndex === 4 && searchResults.length > 3) {
        // "View all" option is selected
        setShowSearchPopup(false);
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      } else if (searchQuery.trim().length > 0) {
        // If no item is selected but there's a search query, navigate to search page
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setShowSearchPopup(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = searchResults.length > 3 ? 4 : searchResults.length - 1; // Include "View all" option
      if (searchResults.length > 0) {
        setSelectedSearchIndex(prev => 
          prev < maxIndex ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIndex = searchResults.length > 3 ? 4 : searchResults.length - 1; // Include "View all" option
      if (searchResults.length > 0) {
        setSelectedSearchIndex(prev => 
          prev > 0 ? prev - 1 : maxIndex
        );
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSearchPopup(false);
      setSelectedSearchIndex(-1);
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Get Discord link from admin settings (use content.socialLinks)
  const discordLink = adminSettings?.content?.socialLinks?.discord || 'https://discord.gg/cinema-fo';

  // Search functionality with debounce
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Hide search popup when on search page
  useEffect(() => {
    if (location.pathname === '/search') {
      setShowSearchPopup(false);
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  }, [location.pathname, searchTimeout]);

  // Listen for custom event to hide search tooltips
  useEffect(() => {
    const handleHideSearchTooltips = () => {
      setShowSearchPopup(false);
      setSearchResults([]);
      setSelectedSearchIndex(-1);
      setSearchQuery('');
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    };

    window.addEventListener('hideSearchTooltips', handleHideSearchTooltips);
    
    return () => {
      window.removeEventListener('hideSearchTooltips', handleHideSearchTooltips);
    };
  }, [searchTimeout]);

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
      setSelectedSearchIndex(-1);
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
        
        // Filter out people results, only keep movies and TV shows
        let searchResults = response.data?.results || [];
        searchResults = searchResults.filter(item => 
          item.media_type === 'movie' || item.media_type === 'tv'
        );
        
        // Filter out items without poster images
        searchResults = searchResults.filter(item => 
          item.poster_path && item.poster_path !== '' && item.poster_path !== null
        );
        
        setSearchResults(searchResults);
        setSelectedSearchIndex(-1); // Reset selection when new results come in
      } catch (error) {
        console.error('❌ Error searching:', error);
        setSearchResults([]);
        setSelectedSearchIndex(-1);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms delay

    setSearchTimeout(timeout);
  };

  const handleSearchItemClick = (item: Movie | TVShow) => {
    console.log('🎬 Search item clicked:', item); // Debug log
    setShowSearchPopup(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSearchIndex(-1);
    setIsMobileMenuOpen(false); // Close mobile menu when item is clicked
    
    // Set the selected item to open as popup modal
    if ('title' in item) {
      console.log('🎬 Opening movie modal for:', item.title);
      setSelectedMovie(item);
    } else {
      console.log('📺 Opening TV show modal for:', item.name);
      setSelectedShow(item);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchPopup(false);
    setSelectedSearchIndex(-1);
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

  // Handle scroll behavior for navbar positioning (navbar stays visible, only announcement bar hides)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always keep navbar visible, just adjust position based on announcement bar visibility
      // The announcement bar component handles its own hiding/showing
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const searchContainer = target.closest('.search-container');
      const searchPopup = target.closest('[data-search-popup]');
      const searchInput = target.closest('input[type="text"]');
      
      // Don't close if clicking inside search container, search popup, or search input
      if (!searchContainer && !searchPopup && !searchInput) {
        console.log('🖱️ Clicking outside, closing popup');
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
      <nav 
        className="fixed left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-gray-800/30 h-[80px] transition-all duration-300"
        style={{
          top: getNavbarTopPosition()
        }}
      >
        <div className="w-full h-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
            {/* Logo - Left corner */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 group">
              <img 
                src="/logo.svg" 
                  alt="CINEMA.BZ" 
                  className="h-8 sm:h-9 md:h-10 lg:h-12 w-auto transition-all duration-300 group-hover:scale-105 filter group-hover:brightness-110"
              />
              </Link>
            </div>

            {/* Navigation Items and Search - Center (Desktop and Large Tablets) */}
            <div className="hidden xl:flex items-center space-x-8 flex-1 justify-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 hover:scale-105 ${
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
              
              {/* Search Bar - Centered with navigation (Desktop Only) */}
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
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchQuery.trim().length > 0) {
                          setShowSearchPopup(true);
                          // Always show results if we have them, even if clicking back into search
                          if (searchResults.length > 0) {
                            setShowSearchPopup(true);
                          } else {
                            handleSearch(searchQuery);
                          }
                        }
                      }}
                        onBlur={() => setIsSearchFocused(false)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder=""
                        className="w-full bg-white/10 text-white pl-10 pr-10 py-2.5 rounded-full border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400 transition-all duration-300 focus:bg-white/15"
                      />
                      {!searchQuery && (
                        <div className="absolute left-10 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-gray-400 pointer-events-none">
                          <img src="/logo.svg" alt="Cinema.bz" className="h-4 opacity-50" />
                        </div>
                      )}
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
                  <div 
                    data-search-popup="true"
                    className="absolute top-full left-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50 w-full"
                  >
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
                            className={`p-3 text-center cursor-pointer border-t border-gray-700/50 ${
                              selectedSearchIndex === 4 
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500' 
                                : 'text-blue-400 hover:text-blue-300'
                            }`}
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

            {/* Tablet Navigation (lg to xl - iPad Pro and similar) */}
            <div className="hidden lg:flex xl:hidden items-center space-x-3 flex-1 justify-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-2.5 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-1.5 hover:scale-105 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="text-xs">{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Tablet Search Bar (lg to xl) */}
              <div className="relative search-container ml-4">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchQuery.trim().length > 0) {
                          setShowSearchPopup(true);
                          // Always show results if we have them, even if clicking back into search
                          if (searchResults.length > 0) {
                            setShowSearchPopup(true);
                          } else {
                            handleSearch(searchQuery);
                          }
                        }
                      }}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search..."
                      className="w-48 bg-white/10 text-white pl-9 pr-8 py-2 rounded-full border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400 transition-all duration-300 focus:bg-white/15"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </form>

                {/* Tablet Search Popup */}
                {showSearchPopup && (
                  <div 
                    data-search-popup="true"
                    className="absolute top-full left-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50 w-80"
                  >
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
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjQ2IiB5PSI2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg==';
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
                        
                        {/* View More Results */}
                        {searchResults.length > 4 && (
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

            {/* Tablet Search Bar (md to lg) */}
            <div className="hidden md:flex lg:hidden items-center flex-1 justify-center px-2">
              <div className="relative search-container max-w-sm w-full">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchQuery.trim().length > 0) {
                          setShowSearchPopup(true);
                          // Always show results if we have them, even if clicking back into search
                          if (searchResults.length > 0) {
                            setShowSearchPopup(true);
                          } else {
                            handleSearch(searchQuery);
                          }
                        }
                      }}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search..."
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
                </form>

                {/* Tablet Search Popup */}
                {showSearchPopup && (
                  <div 
                    data-search-popup="true"
                    className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50"
                  >
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
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjQ2IiB5PSI2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg==';
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
                        {searchResults.length > 4 && (
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

            {/* Discord Button - Right side (Desktop Only) */}
            <div className="hidden lg:flex items-center">
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
                                        <span className="text-sm font-bold">Discord</span>
              </a>
            </div>

            {/* Mobile Controls (md and below) */}
            <div className="flex md:hidden items-center gap-2">
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

            {/* Tablet Controls (md to lg) */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              <a
                href={discordLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                <svg 
                  width="18" 
                  height="18" 
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
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

        {/* Mobile/Tablet Menu */}
          <div 
            className="absolute right-0 w-64 md:w-80 bg-black backdrop-blur-xl"
            style={{
              top: isAnnouncementVisible && !inModalView ? `${adminSettings?.appearance?.announcementBar?.height || 48}px` : '0px',
              height: isAnnouncementVisible && !inModalView ? `calc(100vh - ${adminSettings?.appearance?.announcementBar?.height || 48}px)` : '100vh'
            }}
          >
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

              {/* Mobile Search (Mobile Only) */}
              <div className="mb-6 relative md:hidden">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => {
                        console.log('📱 Mobile search focused, query:', searchQuery, 'results:', searchResults.length);
                        // Only show popup if we have results and it's not already showing
                        if (searchQuery.trim().length > 0 && searchResults.length > 0 && !showSearchPopup) {
                          setShowSearchPopup(true);
                        }
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder=""
                      className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400"
                    />
                    {!searchQuery && (
                      <div className="absolute left-10 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-gray-400 pointer-events-none">
                        <img src="/logo.svg" alt="Cinema.bz" className="h-4 opacity-50" />
                      </div>
                    )}
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
                  <div 
                    data-search-popup="true"
                    className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-[60] max-h-96 overflow-y-auto"
                  >
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSearchItemClick(item);
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors group"
                            >
                              {/* Poster */}
                              <div className="flex-shrink-0 w-12 h-16 bg-gray-700 rounded overflow-hidden">
                                <img
                                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgOTIgMTM4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iOTIiIGhlaWdodD0iMTM4IiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjQ2IiB5PSI2OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg==';
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
                        {searchResults.length > 3 && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔍 Navigating to search page with query:', searchQuery);
                              setShowSearchPopup(false);
                              setIsMobileMenuOpen(false); // Close mobile menu when navigating
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
                      className={`w-full px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-3 hover:scale-105 ${
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

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {/* TV Show Modal */}
      {selectedShow && (
        <TVShowPlayer
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}

    </>
  );
};

export default Navigation;
