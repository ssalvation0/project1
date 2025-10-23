import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from './logo.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showArrow, setShowArrow] = useState(true);

  const handleArrowClick = () => {
    const targetScroll = window.innerHeight * 1.2;
    const startScroll = window.scrollY;
    const distance = targetScroll - startScroll;
    const duration = 1500; // збільште час
    let start = null;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      
      // easeInOutQuad
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      window.scrollTo(0, startScroll + distance * ease);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  useEffect(() => {
    // Прокрутити на верх при завантаженні
    window.scrollTo(0, 0);
    
    let raf = 0;
    let MAX_SCROLL = Math.max(400, window.innerHeight * 0.6);

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const p = Math.max(0, Math.min(1, scrollTop / MAX_SCROLL));
      document.documentElement.style.setProperty('--scroll-progress', String(p));

      setIsScrolled(p > 0.05);
      
      // Логіка для стрілочки - показувати тільки на самому верху
      setShowArrow(scrollTop < 10);
      
      raf = requestAnimationFrame(update);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      MAX_SCROLL = Math.max(400, window.innerHeight * 0.6);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className={`title ${isScrolled ? 'scrolled' : ''}`}>
        <h1 className="logo-title">
          <img src={logo} alt="TransmogVault" />
        </h1>
      </div>
      <div className="header-line"></div>

      {showArrow && (
        <div 
          className={`scroll-indicator ${!showArrow ? 'hiding' : ''}`} 
          onClick={showArrow ? handleArrowClick : undefined}
          style={{ pointerEvents: showArrow ? 'auto' : 'none' }}
        >
          <svg 
            className="scroll-arrow" 
            viewBox="0 0 24 24" 
            fill="none"
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </div>
      )}
    </>
  );
};

export default Header;