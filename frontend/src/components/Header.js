import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    // динамічний діапазон прокрутки: мінімум 400px або 60% висоти вікна
    let MAX_SCROLL = Math.max(400, window.innerHeight * 0.6);
    const HEADER_CENTER_VH = 6; // кінцева позиція хедера в vh (підкоригуй при потребі)

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const p = Math.max(0, Math.min(1, scrollTop / MAX_SCROLL));
      document.documentElement.style.setProperty('--scroll-progress', String(p));

      // інтерполяція top між центром viewport і центром хедера (пікселі)
      const startTop = window.innerHeight / 2;
      const endTop = window.innerHeight * (HEADER_CENTER_VH / 100);
      const topPx = Math.round(startTop * (1 - p) + endTop * p);
      document.documentElement.style.setProperty('--title-top', `${topPx}px`);

      // стан scrolled (за потреби)
      // setIsScrolled(scrollTop >= MAX_SCROLL); // якщо потрібно зберегти isScrolled
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      MAX_SCROLL = Math.max(400, window.innerHeight * 0.6);
      update();
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
        <h1
          className="logo-title"
          style={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/logo.png)`
          }}
        >
          TransmogVault
        </h1>
      </div>
      <div className="header-line"></div>
    </>
  );
};

export default Header;