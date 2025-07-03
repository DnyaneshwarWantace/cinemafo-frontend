import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Shows from './pages/Shows';
import Search from './pages/Search';
import NotFound from './pages/NotFound';
import Upcoming from './pages/Upcoming';
import Footer from './components/Footer';
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
