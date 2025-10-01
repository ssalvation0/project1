import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
    return (
      <header className="header">
        <h1>TransmogVault</h1>
        <nav>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/catalog">Catalog</Link></li>
          </ul>
        </nav>
      </header>
    );
  };
    
export default Header;