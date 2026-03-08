import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, getTransmogSet } from '../services/api';
import TransmogCard from '../components/TransmogCard';
import '../styles/Profile.css';

// TODO: remove demo user after login works
const DEMO_USER = {
  name: 'Serhiy Danylyuk',
  email: 'serhiy@example.com',
  preferences: ['plate', 'weapons', 'sets'],
  createdAt: '2026-01-15T10:00:00.000Z',
};

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoriteTransmogs, setFavoriteTransmogs] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // No token — show demo user for preview
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    getMe()
      .then((data) => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        // Fallback to demo on error
        setUser(DEMO_USER);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Load favorite transmog IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
      setFavorites(stored);
    } catch {
      setFavorites([]);
    }
  }, []);

  // Fetch transmog details for each favorite ID
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteTransmogs([]);
      return;
    }

    setFavoritesLoading(true);
    Promise.allSettled(favorites.map(id => getTransmogSet(id)))
      .then(results => {
        const loaded = results
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value);
        setFavoriteTransmogs(loaded);
      })
      .finally(() => setFavoritesLoading(false));
  }, [favorites]);

  // Toggle favorite (remove from profile)
  const toggleFavorite = useCallback((transmogId) => {
    setFavorites(prev => {
      const newFavs = prev.includes(transmogId)
        ? prev.filter(id => id !== transmogId)
        : [...prev, transmogId];
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavs));
      return newFavs;
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  if (loading && !user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  const preferenceLabels = {
    plate: { label: 'Plate', icon: '🛡️' },
    mail: { label: 'Mail', icon: '⛓️' },
    leather: { label: 'Leather', icon: '🦊' },
    cloth: { label: 'Cloth', icon: '🧙' },
    weapons: { label: 'Weapons', icon: '⚔️' },
    sets: { label: 'Full Sets', icon: '👑' },
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header Section */}
        <div className="profile-header-section">
          <div className="profile-avatar">
            <span className="profile-avatar-text">{initials}</span>
          </div>
          <div className="profile-header-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
            <p className="profile-member-since">Member since {memberSince}</p>
          </div>
        </div>

        {/* Preferences Section */}
        {user.preferences && user.preferences.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Your Preferences</h2>
            <div className="profile-preferences">
              {user.preferences.map((pref) => {
                const info = preferenceLabels[pref] || { label: pref, icon: '✨' };
                return (
                  <div key={pref} className="profile-pref-tag">
                    <span className="profile-pref-icon">{info.icon}</span>
                    <span>{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorites Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">
            Favorites
            {favorites.length > 0 && (
              <span className="profile-fav-count">{favorites.length}</span>
            )}
          </h2>
          {favoritesLoading ? (
            <div className="profile-favorites-loading">
              <div className="profile-loading-spinner" />
              <p>Loading favorites...</p>
            </div>
          ) : favoriteTransmogs.length > 0 ? (
            <div className="profile-favorites-grid">
              {favoriteTransmogs.map(transmog => (
                <TransmogCard
                  key={transmog.id}
                  transmog={transmog}
                  isFavorite={favorites.includes(transmog.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="profile-favorites-empty">
              <span className="profile-favorites-empty-icon">❤️</span>
              <p>No favorites yet</p>
              <p className="profile-favorites-empty-hint">
                Browse the catalog and click the heart icon to save your favorite transmog sets
              </p>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">Account</h2>
          <div className="profile-account-info">
            <div className="profile-info-row">
              <span className="profile-info-label">Name</span>
              <span className="profile-info-value">{user.name}</span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button className="profile-logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
