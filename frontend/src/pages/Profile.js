import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransmogSet, generatePreviewUrl } from '../services/api';
import { supabase } from '../services/supabase';
import TransmogCard from '../components/TransmogCard';
import '../styles/Profile.css';

const AVATAR_BUCKET = 'avatars';
const CLASS_PREFERENCE_IDS = [
  'warrior', 'paladin', 'hunter', 'rogue', 'priest', 'deathknight',
  'shaman', 'mage', 'warlock', 'monk', 'druid', 'demonhunter', 'evoker',
];
const STYLE_PREFERENCE_OPTIONS = [
  { id: 'plate', label: 'Plate', icon: '🛡️' },
  { id: 'mail', label: 'Mail', icon: '⛓️' },
  { id: 'leather', label: 'Leather', icon: '🦊' },
  { id: 'cloth', label: 'Cloth', icon: '🧙' },
  { id: 'weapons', label: 'Weapons', icon: '⚔️' },
  { id: 'sets', label: 'Full Sets', icon: '👑' },
];
const CLASS_PREFERENCE_OPTIONS = [
  { id: 'warrior', label: 'Warrior' },
  { id: 'paladin', label: 'Paladin' },
  { id: 'hunter', label: 'Hunter' },
  { id: 'rogue', label: 'Rogue' },
  { id: 'priest', label: 'Priest' },
  { id: 'deathknight', label: 'Death Knight' },
  { id: 'shaman', label: 'Shaman' },
  { id: 'mage', label: 'Mage' },
  { id: 'warlock', label: 'Warlock' },
  { id: 'monk', label: 'Monk' },
  { id: 'druid', label: 'Druid' },
  { id: 'demonhunter', label: 'Demon Hunter' },
  { id: 'evoker', label: 'Evoker' },
];

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoriteTransmogs, setFavoriteTransmogs] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editStylePreferences, setEditStylePreferences] = useState([]);
  const [editClassPreferences, setEditClassPreferences] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/');
        return;
      }
      const u = session.user;
      const legacyPrefs = u.user_metadata?.preferences || [];
      const stylePreferences = u.user_metadata?.style_preferences
        || legacyPrefs.filter((p) => !CLASS_PREFERENCE_IDS.includes(p));
      const classPreferences = u.user_metadata?.class_preferences
        || legacyPrefs.filter((p) => CLASS_PREFERENCE_IDS.includes(p));
      setUser({
        id: u.id,
        name: u.user_metadata?.name || u.user_metadata?.full_name || u.email.split('@')[0],
        email: u.email,
        stylePreferences,
        classPreferences,
        preferences: [...stylePreferences, ...classPreferences],
        createdAt: u.created_at,
        avatarUrl: u.user_metadata?.avatar_url || null,
      });
      setLoading(false);
    });
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
          .map(r => {
            const transmog = r.value;
            // Ensure previewUrl is always present (fallback to generated URL if missing)
            if (!transmog.previewUrl) {
              transmog.previewUrl = generatePreviewUrl(transmog.id);
            }
            return transmog;
          });
        setFavoriteTransmogs(loaded);
      })
      .finally(() => setFavoritesLoading(false));
  }, [favorites]);

  const toggleFavorite = useCallback((transmogId) => {
    setFavorites(prev => {
      const newFavs = prev.includes(transmogId)
        ? prev.filter(id => id !== transmogId)
        : [...prev, transmogId];
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavs));
      return newFavs;
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditAvatarUrl(user?.avatarUrl || '');
    setEditAvatarFile(null);
    setEditStylePreferences(user?.stylePreferences || []);
    setEditClassPreferences(user?.classPreferences || []);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('Please choose an image file.');
      return;
    }

    const maxSizeMb = 3;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setEditError(`Avatar file is too large. Max size is ${maxSizeMb}MB.`);
      return;
    }

    setEditError('');
    setEditAvatarFile(file);
  };

  const toggleEditStylePreference = (prefKey) => {
    setEditStylePreferences((prev) => {
      if (prev.includes(prefKey)) {
        return prev.filter((p) => p !== prefKey);
      }
      return [...prev, prefKey];
    });
  };

  const toggleEditClassPreference = (classKey) => {
    setEditClassPreferences((prev) => {
      if (prev.includes(classKey)) {
        return prev.filter((p) => p !== classKey);
      }
      if (prev.length >= 3) return prev;
      return [...prev, classKey];
    });
  };

  const handleSaveProfile = async () => {
    const nextName = editName.trim();

    if (!nextName) {
      setEditError('Nickname cannot be empty.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      let nextAvatar = editAvatarUrl.trim();

      if (editAvatarFile) {
        const ext = editAvatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, editAvatarFile, { upsert: true, contentType: editAvatarFile.type });

        if (uploadError) {
          throw new Error('Avatar upload failed. Make sure Supabase Storage bucket "avatars" exists and is public.');
        }

        const { data: publicData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(path);

        nextAvatar = publicData?.publicUrl || '';
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          name: nextName,
          style_preferences: editStylePreferences,
          class_preferences: editClassPreferences,
          preferences: [...editStylePreferences, ...editClassPreferences],
          avatar_url: nextAvatar || null,
        },
      });

      if (error) throw error;

      setUser((prev) => ({
        ...prev,
        name: nextName,
        stylePreferences: editStylePreferences,
        classPreferences: editClassPreferences,
        preferences: [...editStylePreferences, ...editClassPreferences],
        avatarUrl: nextAvatar || null,
      }));

      setIsEditOpen(false);
    } catch (err) {
      setEditError(err.message || 'Failed to save profile.');
    } finally {
      setEditSaving(false);
    }
  };

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
            <div className="profile-header-top">
              <div className="profile-header-info">
                <h1 className="profile-name">{user.name}</h1>
                <p className="profile-email">{user.email}</p>

                <div className="profile-header-badges">
                  <span className="profile-badge">Member since {memberSince}</span>
                  <span className="profile-badge">{favorites.length} favorites</span>
                </div>
              </div>
              <button className="profile-edit-btn" onClick={handleEditProfile}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                Edit Profile
              </button>
            </div>
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

        {/* Actions */}
        <div className="profile-actions">
          <button className="profile-logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      {isEditOpen && (
        <div className="profile-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="profile-edit-modal">
            <div className="profile-edit-header">
              <h2>Edit Profile</h2>
              <button
                type="button"
                className="profile-edit-close"
                onClick={() => setIsEditOpen(false)}
                aria-label="Close edit profile"
              >
                ×
              </button>
            </div>

            <div className="profile-edit-body">
              <label className="profile-edit-label" htmlFor="profile-edit-name">Nickname</label>
              <input
                id="profile-edit-name"
                className="profile-edit-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your nickname"
                maxLength={40}
              />

              <label className="profile-edit-label" htmlFor="profile-edit-avatar">Avatar URL</label>
              <div className="profile-edit-avatar-row">
                <label className="profile-edit-upload-btn" htmlFor="profile-edit-avatar">
                  Upload image
                </label>
                <input
                  id="profile-edit-avatar"
                  type="file"
                  accept="image/*"
                  className="profile-edit-file-input"
                  onChange={handleAvatarFileChange}
                />
                <span className="profile-edit-upload-name">
                  {editAvatarFile ? editAvatarFile.name : 'No file selected'}
                </span>
              </div>

              <p className="profile-edit-helper">PNG, JPG, WEBP up to 3MB.</p>

              <p className="profile-edit-label">Preferences</p>
              <div className="profile-edit-preferences">
                {STYLE_PREFERENCE_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`profile-edit-pref ${editStylePreferences.includes(item.id) ? 'active' : ''}`}
                    onClick={() => toggleEditStylePreference(item.id)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <p className="profile-edit-label">Class Preferences (up to 3)</p>
              <div className="profile-edit-preferences">
                {CLASS_PREFERENCE_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`profile-edit-pref ${editClassPreferences.includes(item.id) ? 'active' : ''}`}
                    onClick={() => toggleEditClassPreference(item.id)}
                  >
                    <img
                      src={`https://wow.zamimg.com/images/wow/icons/medium/classicon_${item.id}.jpg`}
                      alt={item.label}
                      className="profile-edit-class-icon"
                      loading="lazy"
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {editError && <p className="profile-edit-error">{editError}</p>}
            </div>

            <div className="profile-edit-actions">
              <button
                type="button"
                className="profile-edit-cancel"
                onClick={() => setIsEditOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-edit-save"
                onClick={handleSaveProfile}
                disabled={editSaving}
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
