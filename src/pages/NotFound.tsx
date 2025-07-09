import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Film, ArrowLeft, Play } from 'lucide-react';
import Footer from '@/components/Footer';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import AnnouncementBar from '@/components/AnnouncementBar';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <AnnouncementBar />
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Film Strip Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="film-strip-animation"></div>
      </div>

      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* 404 Text with Gradient */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-gradient-blue mb-4 animate-pulse">
            404
          </h1>
          <div className="text-4xl md:text-6xl font-bold text-white mb-6">
            Page Not Found
          </div>
        </div>

        {/* Cinema-themed Message */}
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            <Film className="text-blue-400 mr-3" size={32} />
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              This Scene Doesn't Exist
            </h2>
          </div>
          <p className="text-gray-400 text-lg leading-relaxed">
            Looks like this page has been cut from the final edit. 
            <br />
            Let's get you back to the main feature.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-gradient-primary flex items-center gap-3 px-8 py-4 rounded-lg text-white font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Home size={20} />
            Back to Home
          </button>
          
          <button
            onClick={() => navigate('/search')}
            className="btn-secondary flex items-center gap-3 px-8 py-4 rounded-lg text-white font-semibold transition-all duration-300 hover:scale-105"
          >
            <Search size={20} />
            Search Movies
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 px-4 py-2 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>

        {/* Quick Links */}
        <div className="border-t border-gray-800 pt-8">
          <p className="text-gray-500 mb-4">Quick Links</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a 
              href="/movies" 
              className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
            >
              Movies
            </a>
            <a 
              href="/shows" 
              className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
            >
              TV Shows
            </a>
            <a 
              href="/upcoming" 
              className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
            >
              Upcoming
            </a>
            <a 
              href="/watchlist" 
              className="text-gray-400 hover:text-blue-400 transition-colors text-sm"
            >
              Watchlist
            </a>
          </div>
        </div>
      </div>

      </div>

      {/* Footer */}
      <Footer />
      
      {/* Floating Social Buttons */}
      <FloatingSocialButtons />

      {/* Film Strip Animation Styles */}
      <style jsx>{`
        .film-strip-animation {
          background-image: 
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(59, 130, 246, 0.1) 40px,
              rgba(59, 130, 246, 0.1) 60px
            );
          animation: filmStrip 20s linear infinite;
          height: 100%;
          width: 120%;
          transform: rotate(-10deg);
        }

        @keyframes filmStrip {
          0% { transform: translateX(-100px) rotate(-10deg); }
          100% { transform: translateX(100px) rotate(-10deg); }
        }

        .text-gradient-blue {
          background: linear-gradient(135deg, #60a5fa, #3b82f6, #1d4ed8, #2563eb);
          background-size: 400% 400%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .btn-gradient-primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8, #1e40af);
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
          transition: all 0.3s ease;
        }

        .btn-gradient-primary:hover {
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
          transform: translateY(-2px) scale(1.05);
        }

        .btn-secondary {
          background: rgba(55, 65, 81, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(75, 85, 99, 0.8);
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
};

export default NotFound;
