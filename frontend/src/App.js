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

  // JSON-LD Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TransmogVault",
    "description": "Browse and explore epic World of Warcraft transmog sets. Find inspiration for your character's style.",
    "url": "https://wickless-actively-nora.ngrok-free.dev",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://wickless-actively-nora.ngrok-free.dev/catalog?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Router>
      <ToastProvider>
        <div className="App">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
          <div 
            className="background-image"
            style={{ 
              backgroundImage: `url(${backgroundImage})`,
              opacity: 1 
            }}
            aria-hidden="true"
          />
          <div 
            className="background-overlay"
            style={{ opacity: scrollOpacity }}
            aria-hidden="true"
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