import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from './logo.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    let MAX_SCROLL = Math.max(400, window.innerHeight * 0.6);

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const p = Math.max(0, Math.min(1, scrollTop / MAX_SCROLL));
      document.documentElement.style.setProperty('--scroll-progress', String(p));

      setIsScrolled(p > 0.05);
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
    </>
  );
};

export default Header;