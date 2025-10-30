import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Particles from './components/Particles';
import './App.css';
import backgroundImage from './images/background.jpg';
import ToastProvider from './components/ToastProvider';

const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const TransmogDetail = lazy(() => import('./pages/TransmogDetail'));

function App() {
  const [scrollOpacity, setScrollOpacity] = useState(0.3);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const maxScroll = 500;
      const newOpacity = Math.min(0.3 + (scrollPosition / maxScroll) * 0.4, 0.7);
      setScrollOpacity(newOpacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Router>
      <ToastProvider>
        <div className="App">
          <div 
            className="background-image"
            style={{ 
              backgroundImage: `url(${backgroundImage})`,
              opacity: 1 
            }}
          />
          <div 
            className="background-overlay"
            style={{ opacity: scrollOpacity }}
          />
          <Particles />
          <Header />
          <Suspense fallback={<div style={{padding:'140px 20px',textAlign:'center',color:'#e5d3b3'}}>Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/transmog/:id" element={<TransmogDetail />} />
            </Routes>
          </Suspense>
          <Footer />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;