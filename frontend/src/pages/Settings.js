import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Settings.css';

const AVATAR_BUCKET = 'avatars';

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

function Settings() {
  const { user, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);

  // Edit states
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stylePreferences, setStylePreferences] = useState([]);
  const [classPreferences, setClassPreferences] = useState([]);

  // Feedback
  const [rowSaving, setRowSaving] = useState(null);
  const [rowError, setRowError] = useState({});
  const [rowSuccess, setRowSuccess] = useState({});

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatarPreview(user.avatarUrl || '');
      setStylePreferences(user.stylePreferences || []);
      setClassPreferences(user.classPreferences || []);
    }
  }, [user]);

  const toggle = (key) => {
    setExpanded(prev => prev === key ? null : key);
    setRowError({});
    setRowSuccess({});
  };

  const setFeedback = (key, type, msg) => {
    if (type === 'error') setRowError(prev => ({ ...prev, [key]: msg }));
    if (type === 'success') {
      setRowSuccess(prev => ({ ...prev, [key]: msg }));
      setTimeout(() => setRowSuccess(prev => ({ ...prev, [key]: '' })), 3000);
    }
  };

  // --- Handlers ---

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    setRowSaving('avatar');
    try {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (uploadError) throw new Error('Avatar upload failed.');
      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      await updateProfile({ ...currentProfileData(), avatarUrl: publicData?.publicUrl || null });
      setAvatarFile(null);
      setFeedback('avatar', 'success', 'Avatar updated!');
      setExpanded(null);
    } catch (err) {
      setFeedback('avatar', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setFeedback('name', 'error', 'Nickname cannot be empty.'); return; }
    setRowSaving('name');
    try {
      await updateProfile({ ...currentProfileData(), name: trimmed });
      setFeedback('name', 'success', 'Nickname updated!');
      setExpanded(null);
    } catch (err) {
      setFeedback('name', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const handleSaveEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setFeedback('email', 'error', 'Email cannot be empty.'); return; }
    if (trimmed === user.email) { setFeedback('email', 'error', 'Same as current email.'); return; }
    setRowSaving('email');
    try {
      const { error: err } = await supabase.auth.updateUser({ email: trimmed });
      if (err) throw err;
      setFeedback('email', 'success', 'Confirmation sent to new email.');
      setExpanded(null);
    } catch (err) {
      setFeedback('email', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { setFeedback('password', 'error', 'Min 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setFeedback('password', 'error', 'Passwords do not match.'); return; }
    setRowSaving('password');
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      setNewPassword('');
      setConfirmPassword('');
      setFeedback('password', 'success', 'Password updated!');
      setExpanded(null);
    } catch (err) {
      setFeedback('password', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const handleSaveStyle = async () => {
    setRowSaving('style');
    try {
      await updateProfile({ ...currentProfileData(), stylePreferences });
      setFeedback('style', 'success', 'Saved!');
      setExpanded(null);
    } catch (err) {
      setFeedback('style', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const handleSaveClass = async () => {
    setRowSaving('class');
    try {
      await updateProfile({ ...currentProfileData(), classPreferences });
      setFeedback('class', 'success', 'Saved!');
      setExpanded(null);
    } catch (err) {
      setFeedback('class', 'error', err.message);
    } finally {
      setRowSaving(null);
    }
  };

  const currentProfileData = () => ({
    name: user.name,
    avatarUrl: user.avatarUrl,
    classPreferences: user.classPreferences || [],
    stylePreferences: user.stylePreferences || [],
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFeedback('avatar', 'error', 'Not an image.'); return; }
    if (file.size > 3 * 1024 * 1024) { setFeedback('avatar', 'error', 'Max 3MB.'); return; }
    setRowError(prev => ({ ...prev, avatar: '' }));
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  if (loading || !user) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="settings-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const chevron = (key) => (
    <svg className={`st-chevron ${expanded === key ? 'st-chevron--open' : ''}`} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
    </svg>
  );

  const icon = (d) => (
    <svg className="st-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d={d} /></svg>
  );

  const icons = {
    avatar: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    nickname: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    email: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    password: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z',
    style: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.22.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    class: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
  };

  const styleDisplay = (user.stylePreferences || [])
    .map(id => STYLE_PREFERENCE_OPTIONS.find(o => o.id === id))
    .filter(Boolean)
    .map(o => o.label)
    .join(', ') || 'Not set';

  const classDisplay = (user.classPreferences || [])
    .map(id => CLASS_PREFERENCE_OPTIONS.find(o => o.id === id))
    .filter(Boolean)
    .map(o => o.label)
    .join(', ') || 'Not set';

  return (
    <div className="settings-page">
      <div className="settings-container">

        <div className="settings-page-header">
          <button className="settings-back" onClick={() => navigate(-1)} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>

        {/* ── Profile ── */}
        <div className="st-section">
          <h2 className="st-section-title">Profile</h2>
          <div className="st-card">

            {/* Avatar */}
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('avatar')}>
                <div className="st-row-left">
                  {icon(icons.avatar)}
                  <span className="st-label">Avatar</span>
                </div>
                <div className="st-row-right">
                  <div className="st-avatar-thumb">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt="" />
                      : <span>{initials}</span>}
                  </div>
                  {chevron('avatar')}
                </div>
              </div>
              {expanded === 'avatar' && (
                <div className="st-row-expand">
                  <div className="st-avatar-edit">
                    <div className="st-avatar-preview-lg">
                      {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>{initials}</span>}
                    </div>
                    <div className="st-avatar-edit-actions">
                      <label className="st-btn st-btn--secondary" htmlFor="st-avatar-input">Choose File</label>
                      <input id="st-avatar-input" type="file" accept="image/*" className="st-file-hidden" onChange={handleAvatarChange} />
                      <span className="st-hint">PNG, JPG, WEBP up to 3MB</span>
                    </div>
                  </div>
                  {rowError.avatar && <p className="st-feedback st-feedback--error">{rowError.avatar}</p>}
                  {rowSuccess.avatar && <p className="st-feedback st-feedback--success">{rowSuccess.avatar}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSaveAvatar} disabled={!avatarFile || rowSaving === 'avatar'}>
                      {rowSaving === 'avatar' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="st-divider" />

            {/* Nickname */}
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('name')}>
                <div className="st-row-left">
                  {icon(icons.nickname)}
                  <span className="st-label">Nickname</span>
                  <span className="st-value">{user.name}</span>
                </div>
                {chevron('name')}
              </div>
              {expanded === 'name' && (
                <div className="st-row-expand">
                  <input className="st-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter nickname" maxLength={40} autoFocus />
                  {rowError.name && <p className="st-feedback st-feedback--error">{rowError.name}</p>}
                  {rowSuccess.name && <p className="st-feedback st-feedback--success">{rowSuccess.name}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSaveName} disabled={rowSaving === 'name'}>
                      {rowSaving === 'name' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="st-divider" />

            {/* Email */}
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('email')}>
                <div className="st-row-left">
                  {icon(icons.email)}
                  <span className="st-label">Email</span>
                  <span className="st-value">{user.email}</span>
                </div>
                {chevron('email')}
              </div>
              {expanded === 'email' && (
                <div className="st-row-expand">
                  <input className="st-input" type="email" value={email} onChange={e => { setEmail(e.target.value); setRowError(p => ({ ...p, email: '' })); }} placeholder="New email" autoFocus />
                  {rowError.email && <p className="st-feedback st-feedback--error">{rowError.email}</p>}
                  {rowSuccess.email && <p className="st-feedback st-feedback--success">{rowSuccess.email}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSaveEmail} disabled={rowSaving === 'email'}>
                      {rowSaving === 'email' ? 'Sending...' : 'Change'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Security ── */}
        <div className="st-section">
          <h2 className="st-section-title">Security</h2>
          <div className="st-card">
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('password')}>
                <div className="st-row-left">
                  {icon(icons.password)}
                  <span className="st-label">Password</span>
                  <span className="st-value">••••••••</span>
                </div>
                {chevron('password')}
              </div>
              {expanded === 'password' && (
                <div className="st-row-expand">
                  <input className="st-input" type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setRowError(p => ({ ...p, password: '' })); }} placeholder="New password" autoComplete="new-password" autoFocus />
                  <input className="st-input" type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setRowError(p => ({ ...p, password: '' })); }} placeholder="Confirm password" autoComplete="new-password" />
                  {rowError.password && <p className="st-feedback st-feedback--error">{rowError.password}</p>}
                  {rowSuccess.password && <p className="st-feedback st-feedback--success">{rowSuccess.password}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSavePassword} disabled={rowSaving === 'password' || !newPassword}>
                      {rowSaving === 'password' ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="st-section">
          <h2 className="st-section-title">Preferences</h2>
          <div className="st-card">

            {/* Style */}
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('style')}>
                <div className="st-row-left">
                  {icon(icons.style)}
                  <span className="st-label">Style</span>
                  <span className={`st-value ${styleDisplay === 'Not set' ? 'st-value--empty' : ''}`}>{styleDisplay}</span>
                </div>
                {chevron('style')}
              </div>
              {expanded === 'style' && (
                <div className="st-row-expand">
                  <div className="st-tags">
                    {STYLE_PREFERENCE_OPTIONS.map(item => (
                      <button key={item.id} type="button" className={`st-tag ${stylePreferences.includes(item.id) ? 'active' : ''}`} onClick={() => setStylePreferences(prev => prev.includes(item.id) ? prev.filter(p => p !== item.id) : [...prev, item.id])}>
                        <span>{item.icon}</span> <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  {rowError.style && <p className="st-feedback st-feedback--error">{rowError.style}</p>}
                  {rowSuccess.style && <p className="st-feedback st-feedback--success">{rowSuccess.style}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSaveStyle} disabled={rowSaving === 'style'}>
                      {rowSaving === 'style' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="st-divider" />

            {/* Class */}
            <div className="st-row">
              <div className="st-row-main" onClick={() => toggle('class')}>
                <div className="st-row-left">
                  {icon(icons.class)}
                  <span className="st-label">Class</span>
                  <span className={`st-value ${classDisplay === 'Not set' ? 'st-value--empty' : ''}`}>{classDisplay}</span>
                </div>
                {chevron('class')}
              </div>
              {expanded === 'class' && (
                <div className="st-row-expand">
                  <p className="st-hint" style={{ margin: '0 0 8px' }}>Choose up to 3</p>
                  <div className="st-tags">
                    {CLASS_PREFERENCE_OPTIONS.map(item => (
                      <button key={item.id} type="button" className={`st-tag ${classPreferences.includes(item.id) ? 'active' : ''}`} onClick={() => setClassPreferences(prev => { if (prev.includes(item.id)) return prev.filter(p => p !== item.id); if (prev.length >= 3) return prev; return [...prev, item.id]; })}>
                        <img src={`https://wow.zamimg.com/images/wow/icons/medium/classicon_${item.id}.jpg`} alt={item.label} className="st-class-icon" loading="lazy" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  {rowError.class && <p className="st-feedback st-feedback--error">{rowError.class}</p>}
                  {rowSuccess.class && <p className="st-feedback st-feedback--success">{rowSuccess.class}</p>}
                  <div className="st-row-actions">
                    <button className="st-btn st-btn--ghost" onClick={() => setExpanded(null)}>Cancel</button>
                    <button className="st-btn st-btn--primary" onClick={handleSaveClass} disabled={rowSaving === 'class'}>
                      {rowSaving === 'class' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;
