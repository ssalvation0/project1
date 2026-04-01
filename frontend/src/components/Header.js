import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from './logo.png';
import AuthModal from './AuthModal';
import { supabase } from '../services/supabase';

function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Listen to Supabase auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          name: u.user_metadata?.name || u.user_metadata?.full_name || u.email.split('@')[0],
          email: u.email,
          preferences: u.user_metadata?.preferences || [],
          createdAt: u.created_at,
          avatarUrl: u.user_metadata?.avatar_url || null,
        });
      }
    });

    // Subscribe to auth changes (login, logout, Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          name: u.user_metadata?.name || u.user_metadata?.full_name || u.email.split('@')[0],
          email: u.email,
          preferences: u.user_metadata?.preferences || [],
          createdAt: u.created_at,
          avatarUrl: u.user_metadata?.avatar_url || null,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = useCallback((userData) => {
    setUser(userData);
  }, []);

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

          {user && (
            <Link to="/profile" className="login-btn" style={{ textDecoration: 'none', marginRight: 8 }}>
              Profile
            </Link>
          )}

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
