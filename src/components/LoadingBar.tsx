
import React, { useEffect, useState } from 'react';

interface LoadingBarProps {
  isLoading: boolean;
  className?: string;
}

const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading, className = '' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (!isLoading && progress === 0) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${className}`}>
      <div 
        className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          transform: 'translateX(0)',
          transition: progress === 100 ? 'width 0.5s ease-out' : 'width 0.1s ease-out'
        }}
      />
    </div>
  );
};

export default LoadingBar;
