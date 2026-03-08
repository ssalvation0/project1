import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';
import AuthModal from './AuthModal';

function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const syncAuth = useCallback(() => {
    try {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    } catch { setUser(null); }
  }, []);

  useEffect(() => {
    window.addEventListener('auth-change', syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener('auth-change', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, [syncAuth]);

  const handleAuth = (userData) => {
    setUser(userData);
    window.dispatchEvent(new Event('auth-change'));
  };

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

          {/* Global Search */}
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

          {/* TODO: remove temp link */}
          <Link to="/profile" className="login-btn" style={{ textDecoration: 'none', marginRight: 8 }}>
            Profile
          </Link>

          <button
            className="login-btn"
            onClick={handleProfileClick}
            aria-label={user ? 'Open profile' : 'Sign up or login'}
          >
            {user ? user.name : 'Sign up / Login'}
          </button>
        </div>
      </nav>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuth={handleAuth}
      />
    </>
  );
}

export default Header;
