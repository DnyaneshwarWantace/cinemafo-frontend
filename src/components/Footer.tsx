
import React from 'react';
import { Button } from "@/components/ui/button";

const Footer = () => {
  const handleDiscordClick = () => {
    window.open('https://discord.gg/your-discord-server', '_blank');
  };

  return (
    <footer className="bg-gray-900/50 border-t border-gray-800 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* About Us */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">About Us</h3>
            <p className="text-gray-400 leading-relaxed">
              CINEMA.FO is your premium destination for streaming the latest movies and TV shows. 
              We provide high-quality content with an exceptional viewing experience, bringing 
              entertainment right to your fingertips.
            </p>
          </div>
          
          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Quick Links</h3>
            <div className="flex flex-col space-y-2">
              <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                Home
              </Button>
              <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                Movies
              </Button>
              <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                Shows
              </Button>
              <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                Search
              </Button>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Connect With Us</h3>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDiscordClick}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500">
            © 2024 CINEMA.FO. All rights reserved. | Premium Streaming Experience
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
