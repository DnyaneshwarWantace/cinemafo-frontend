import React from 'react';
import { Button } from "@/components/ui/button";
import { Home, Film, Tv, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleDiscordClick = () => {
    window.open('https://discord.gg/your-discord-server', '_blank');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-transparent backdrop-blur-0 border-b-0 fixed top-0 w-full z-50">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div 
              className="text-3xl font-bold text-white cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate('/')}
            >
              <span className="text-red-600 drop-shadow-lg">CINEMA</span>
              <span className="text-blue-400 drop-shadow-lg">.FO</span>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-2">
              <Button 
                variant="ghost" 
                className={`text-white/90 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/') ? 'bg-white/20 text-white shadow-lg' : 'hover:scale-105'
                }`}
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button 
                variant="ghost" 
                className={`text-white/90 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/movies') ? 'bg-white/20 text-white shadow-lg' : 'hover:scale-105'
                }`}
                onClick={() => navigate('/movies')}
              >
                <Film className="w-4 h-4 mr-2" />
                Movies
              </Button>
              <Button 
                variant="ghost" 
                className={`text-white/90 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/shows') ? 'bg-white/20 text-white shadow-lg' : 'hover:scale-105'
                }`}
                onClick={() => navigate('/shows')}
              >
                <Tv className="w-4 h-4 mr-2" />
                Shows
              </Button>
              <Button 
                variant="ghost" 
                className={`text-white/90 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/search') ? 'bg-white/20 text-white shadow-lg' : 'hover:scale-105'
                }`}
                onClick={() => navigate('/search')}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Discord Icon */}
          <Button 
            variant="ghost" 
            onClick={handleDiscordClick}
            className="text-white/90 hover:text-white hover:bg-white/10 p-3 rounded-full hover:scale-110 transition-all duration-200"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
