import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';
import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleProfileClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
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

          <form className="global-search-form" onSubmit={handleSearchSubmit} role="search">
            <input
              type="text"
              className="global-search-input"
              placeholder="Search class, armor type, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search transmogs"
            />
          </form>

          <button
            className={`login-btn ${user ? 'login-btn--profile' : ''}`}
            onClick={handleProfileClick}
            aria-label={user ? 'Open profile' : 'Sign up or login'}
          >
            {user ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ display: 'inline-block' }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            ) : (
              'Sign up / Login'
            )}
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
