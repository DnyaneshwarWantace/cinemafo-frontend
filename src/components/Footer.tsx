
import React from 'react';
import { Button } from "@/components/ui/button";
import { useAdmin } from '@/contexts/AdminContext';

const Footer = () => {
  const { settings } = useAdmin();

  return (
    <footer className="bg-gray-900/50 border-t border-gray-800 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* About Us */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">About Us</h3>
            <p className="text-gray-400 leading-relaxed">
              {settings.aboutUsText}
            </p>
            
            {/* Disclaimer */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <h4 className="text-white font-semibold mb-2">Disclaimer:</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                {settings.disclaimerText}
              </p>
            </div>
          </div>
          
          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Contact Us</h3>
            <p className="text-gray-400 leading-relaxed">
              Have questions or need support? Get in touch with our team.
            </p>
            <div className="space-y-2">
              <Button variant="link" className="text-gray-400 hover:text-white justify-start p-0">
                Contact Support
              </Button>
              <Button 
                variant="link" 
                className="text-gray-400 hover:text-white justify-start p-0"
                onClick={() => window.location.href = '/admin'}
              >
                Admin Login
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
