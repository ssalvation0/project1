import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      /* Коли користувач проскролив більше ніж 50px — вмикаємо стан хедера */
      if (window.scrollY > 50) {
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
      <div className={`intro-logo ${isScrolled ? 'hidden' : ''}`}>
        <img src={logo} alt="TransmogVault" className="big-logo" />
      </div>

      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-content">
          <Link to="/" className="logo-link">
            <img src={logo} alt="TransmogVault" className="small-logo" />
          </Link>
        </div>
      </header>
    </>
  );
}

export default Header;
