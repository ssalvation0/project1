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
      console.log("Перехід до профілю");
      // тут буде перехід до сторінки профілю
    } else {
      setIsModalOpen(true); // якщо не залогінений - відкриваємо модальне вікно
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <img src={logo} alt="TransmogVault" className="small-logo" />
          </Link>

          <button 
            className="profile-button" 
            onClick={handleProfileClick}>
            {isLoggedIn ? 'Profile' : 'Sign up'}
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
