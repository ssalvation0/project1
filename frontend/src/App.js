import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import './App.css';
import backgroundImage from './images/background.jpg';

function App() {
  const [scrollOpacity, setScrollOpacity] = useState(0.3);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = 500; // пікселі, після яких фон повністю затемнений
      
      // Розраховуємо opacity від 0.3 (світло) до 0.7 (темно)
      const newOpacity = Math.min(0.3 + (scrollPosition / maxScroll) * 0.4, 0.7);
      setScrollOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className="App" 
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,${scrollOpacity}), rgba(0,0,0,${scrollOpacity})), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.3s ease'
      }}
    >
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
        <Footer />
      </Router>
    </div>
  );
}

export default App;