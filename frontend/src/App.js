import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Particles from './components/Particles';
import './App.css';
import './styles/buttons.css';
import './styles/tooltip.css';
import backgroundImage from './images/background.jpg';
import ToastProvider from './components/ToastProvider';

// Lazy load pages for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Catalog = React.lazy(() => import('./pages/Catalog'));
const TransmogDetail = React.lazy(() => import('./pages/TransmogDetail'));

// Loading fallback component - uses skeleton cards for better UX
const LoadingFallback = React.memo(() => (
  <div style={{
    padding: '140px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} className="skeleton-card" style={{
        background: 'rgba(20, 15, 10, 0.6)',
        borderRadius: '16px',
        overflow: 'hidden',
        height: '350px'
      }}>
        <div style={{
          width: '100%',
          height: '200px',
          background: 'linear-gradient(90deg, rgba(30,30,30,0.8) 0%, rgba(50,50,50,0.8) 50%, rgba(30,30,30,0.8) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div style={{ padding: '16px' }}>
          <div style={{
            height: '20px',
            background: 'rgba(229,211,179,0.2)',
            borderRadius: '4px',
            marginBottom: '12px',
            width: '70%'
          }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ height: '18px', width: '60px', background: 'rgba(229,211,179,0.15)', borderRadius: '3px' }} />
            <div style={{ height: '18px', width: '60px', background: 'rgba(229,211,179,0.15)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
));

function App() {
  const [scrollOpacity, setScrollOpacity] = useState(0.3);

  useEffect(() => {
    let rafId;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          const scrollPosition = window.scrollY;
          const maxScroll = 500;
          const newOpacity = Math.min(0.3 + (scrollPosition / maxScroll) * 0.4, 0.7);
          setScrollOpacity(newOpacity);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Memoize structured data to prevent recreation on each render
  const structuredData = useMemo(() => ({
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
  }), []);

  // Memoize background styles
  const backgroundStyle = useMemo(() => ({
    backgroundImage: `url(${backgroundImage})`,
    opacity: 1
  }), []);

  const overlayStyle = useMemo(() => ({
    opacity: scrollOpacity
  }), [scrollOpacity]);

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
            style={backgroundStyle}
            aria-hidden="true"
          />
          <div
            className="background-overlay"
            style={overlayStyle}
            aria-hidden="true"
          />
          <Particles />
          <Header />
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/transmog/:id" element={<TransmogDetail />} />
            </Routes>
          </React.Suspense>
          <Footer />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;