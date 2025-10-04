import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      let ticking = false;

      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollProgress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;;

            document.documentElement.style.setProperty('--scroll-progress', scrollProgress);

            if (window.scrollY > 100) {
              setIsScrolled(true);
            } else {
              setIsScrolled(false);
            }

            ticking = false;
          });

          ticking = true;
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
      <>
        <div className={`title ${isScrolled ? 'scrolled' : ''}`}>
          <h1>TransmogVault</h1>
        </div>
        {isScrolled && (
        <header className="header">
        </header>
      )}
      </>
    );
  };
    
export default Header;