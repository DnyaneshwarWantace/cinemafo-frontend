import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetails from './pages/MovieDetails';
import Shows from './pages/Shows';
import Search from './pages/Search';
import NotFound from './pages/NotFound';
import Upcoming from './pages/Upcoming';
import Watchlist from './pages/Watchlist';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <div className="min-h-screen bg-black">
            <Navigation />
            <main className="w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/movie/:id" element={<MovieDetails />} />
                <Route path="/shows" element={<Shows />} />
                <Route path="/upcoming" element={<Upcoming />} />
                <Route path="/search" element={<Search />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
