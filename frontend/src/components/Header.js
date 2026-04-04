import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';
import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleProfileClick = () => {
    if (user) {
      setMenuOpen(prev => !prev);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleMenuNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
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
          <div className="header-left">
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
          </div>

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

          <div className="header-right" ref={menuRef}>
            <button
              className={`login-btn ${user ? 'login-btn--profile' : ''}`}
              onClick={handleProfileClick}
              aria-label={user ? 'Open menu' : 'Sign up or login'}
              aria-expanded={menuOpen}
            >
              {user ? (
                user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="login-btn-avatar" />
                ) : (
                  <span className="login-btn-initials">{initials}</span>
                )
              ) : (
                'Sign up / Login'
              )}
            </button>

            {menuOpen && (
              <div className="header-menu">
                <div className="header-menu-user">
                  <span className="header-menu-name">{user.name}</span>
                  <span className="header-menu-email">{user.email}</span>
                </div>
                <div className="header-menu-divider" />
                <button className="header-menu-item" onClick={() => handleMenuNavigate('/profile')}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  Profile
                </button>
                <button className="header-menu-item" onClick={() => handleMenuNavigate('/settings')}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/></svg>
                  Settings
                </button>
                <div className="header-menu-divider" />
                <button className="header-menu-item header-menu-item--danger" onClick={handleLogout}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
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
