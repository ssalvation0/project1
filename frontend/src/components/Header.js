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
      <nav className="header wide-capsule" role="navigation" aria-label="Main navigation">
        <div className="header-content" style={{ width: '100%' }}>
          <Link to="/" className="logo-link" aria-label="TransmogVault Home">
            <img
              src={logo}
              alt="TransmogVault"
              className="small-logo"
              width="40"
              height="40"
              decoding="async"
            />
          </Link>
          <button
            className="login-btn"
            onClick={handleProfileClick}
            aria-label={isLoggedIn ? 'Open profile' : 'Sign up or login'}
          >
            {isLoggedIn ? 'Profile' : 'Sign up / Login'}
          </button>
        </div>
      </nav>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export default Header;
