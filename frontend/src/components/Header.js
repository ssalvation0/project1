import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        if (window.scrollY > 100) {
          setIsScrolled(true);
        } else {
          setIsScrolled(false);
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