import React, { useState } from 'react';
import { Search, Home, Film, Tv, X, Calendar, Bookmark } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Movies', path: '/movies', icon: Film },
    { name: 'Shows', path: '/shows', icon: Tv },
    { name: 'Upcoming', path: '/upcoming', icon: Calendar },
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/30 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent transition-all duration-300 group-hover:from-blue-300 group-hover:to-blue-500">
              CINEMA.FO
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-baseline space-x-2">
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
            </div>

            {/* Search Bar */}
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

          {/* Discord Icon */}
          <div className="flex items-center">
            <a
              href="https://discord.gg/cinema"
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

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
