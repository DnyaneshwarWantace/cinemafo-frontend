import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Film } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoBack = () => {
    console.log("Go Back clicked");
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    console.log("Go Home clicked");
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative z-10">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center">
            <img 
              src="/logo-icon.svg" 
              alt="CINEMA.BZ" 
              className="w-32 h-32 transition-all duration-300"
            />
          </div>
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
          <p className="text-gray-300 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={handleGoBack}
            className="w-full px-6 py-3 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg font-medium transition-all duration-300 cursor-pointer"
          >
            Go Back
          </button>
          <button 
            onClick={handleGoHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
