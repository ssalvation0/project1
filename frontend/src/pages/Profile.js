import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getTransmogSet, generatePreviewUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import TransmogCard from '../components/TransmogCard';
import '../styles/Profile.css';

function Profile() {
  const { user, loading } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const [favoriteTransmogs, setFavoriteTransmogs] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

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
          .map(r => {
            const transmog = r.value;
            if (!transmog.previewUrl) {
              transmog.previewUrl = generatePreviewUrl(transmog.id);
            }
            return transmog;
          });
        setFavoriteTransmogs(loaded);
      })
      .finally(() => setFavoritesLoading(false));
  }, [favorites]);

  const handleCloseProfile = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
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
    warrior: { label: 'Warrior', icon: '⚔️' },
    paladin: { label: 'Paladin', icon: '🔆' },
    hunter: { label: 'Hunter', icon: '🏹' },
    rogue: { label: 'Rogue', icon: '🗡️' },
    priest: { label: 'Priest', icon: '✨' },
    deathknight: { label: 'Death Knight', icon: '💀' },
    shaman: { label: 'Shaman', icon: '🌩️' },
    mage: { label: 'Mage', icon: '🔮' },
    warlock: { label: 'Warlock', icon: '🟣' },
    monk: { label: 'Monk', icon: '🍃' },
    druid: { label: 'Druid', icon: '🐾' },
    demonhunter: { label: 'Demon Hunter', icon: '👁️' },
    evoker: { label: 'Evoker', icon: '🐉' },
  };

  const visiblePreferences = user.preferences || [];

  return (
    <div className="profile-page">
      <div className="profile-container">
        <button
          type="button"
          className="profile-close-btn"
          onClick={handleCloseProfile}
          aria-label="Close profile"
          title="Close profile"
        >
          ×
        </button>

        {/* Header Section */}
        <div className="profile-header-section">
          <div className="profile-avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-text">{initials}</span>
            )}
          </div>

          <div className="profile-header-content">
            <div className="profile-header-info">
              <h1 className="profile-name">{user.name}</h1>

              <div className="profile-header-badges">
                <span className="profile-badge">Member since {memberSince}</span>
                <span className="profile-badge">{favorites.length} favorites</span>
              </div>

              {(user.classPreferences || []).length > 0 && (
                <div className="profile-class-badges">
                  {user.classPreferences.map(cls => (
                    <span key={cls} className="profile-class-badge">
                      <img
                        src={`https://wow.zamimg.com/images/wow/icons/medium/classicon_${cls}.jpg`}
                        alt={cls}
                        className="profile-class-badge-icon"
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link to="/settings" className="profile-settings-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/></svg>
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Preferences Section */}
        {visiblePreferences.length > 0 && (
          <div className="profile-section">
            <h2 className="profile-section-title">Your Preferences</h2>
            <div className="profile-preferences">
              {visiblePreferences.map((pref) => {
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
                  isFavorite={favorites.includes(String(transmog.id))}
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

      </div>
    </div>
  );
}

export default Profile;
