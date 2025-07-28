import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import AnnouncementBar from './components/AnnouncementBar';
import FloatingSocialButtons from './components/FloatingSocialButtons';
import Footer from './components/Footer';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Shows from './pages/Shows';
import Search from './pages/Search';
import NotFound from './pages/NotFound';
import Watchlist from './pages/Watchlist';
import MoviePlayer from './pages/MoviePlayer';
import TVShowPlayerPage from './pages/TVShowPlayerPage';
import AdminPanel from './components/admin/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';
import VideoPlayer from './components/VideoPlayer';

const queryClient = new QueryClient();

// Layout component to conditionally render Navigation
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  // Trigger admin settings event on app load to ensure ads show
  useEffect(() => {
    const savedSettings = localStorage.getItem('adminSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      window.dispatchEvent(new CustomEvent('adminSettingsChanged', { detail: settings }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {!isAdminPage && <AnnouncementBar />}
      {!isAdminPage && <Navigation inModalView={false} />}
      <main className="w-full pt-[128px]">
        {children}
      </main>
      {!isAdminPage && <FloatingSocialButtons />}
      {!isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Layout>
            <main className="min-h-screen bg-black">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/search" element={<Search />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/watch" element={<VideoPlayer />} />
            <Route path="/movie/:id" element={<MoviePlayer />} />
            <Route path="/tv/:id" element={<TVShowPlayerPage />} />
            <Route path="/admin" element={
              <ErrorBoundary>
                <AdminPanel />
              </ErrorBoundary>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
            </main>
        </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
