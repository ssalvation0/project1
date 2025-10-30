import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';
import AuthModal from './AuthModal';

function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn] = useState(false); // стан авторизації

  const handleProfileClick = () => {
    if (isLoggedIn) {
      // // TODO: Profile navigation
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <header className="header wide-capsule">
        <div className="header-content" style={{width: '100%'}}>
          <Link to="/" className="logo-link">
            <img src={logo} alt="TransmogVault" className="small-logo" />
          </Link>
          <button 
            className="login-btn" 
            onClick={handleProfileClick}>
            {isLoggedIn ? 'Profile' : 'Sign up / Login'}
          </button>
        </div>
      </header>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

export default Header;
