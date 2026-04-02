import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SetPasswordModal.css';

function SetPasswordModal() {
  const { passwordRecovery, setNewPassword, dismissPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!passwordRecovery) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await setNewPassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="set-password-overlay">
        <div className="set-password-modal">
          <h2>Password Updated</h2>
          <p className="set-password-success">Your password has been set successfully. You can now sign in with email and password.</p>
          <button className="set-password-btn" onClick={dismissPasswordRecovery}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="set-password-overlay">
      <div className="set-password-modal">
        <h2>Set New Password</h2>
        <p className="set-password-subtitle">Enter your new password below</p>

        {error && <div className="set-password-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="set-password-field">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="set-password-field">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="set-password-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetPasswordModal;
