import React, { useState, useEffect, useRef } from 'react';
import './AuthModal.css';
import Stepper, { Step } from './Stepper.jsx';
import { supabase } from '../services/supabase';
import { upsertProfile } from '../services/db';

const IconMail = () => (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="3"/>
        <path d="M22 7l-10 6L2 7"/>
    </svg>
);

const IconLock = () => (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2"/>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
);

const IconEye = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const IconEyeOff = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

const IconUser = () => (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M20 21a8 8 0 0 0-16 0"/>
    </svg>
);

function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [preferences, setPreferences] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const modalRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose?.();
            }
            if (e.key === 'Tab') {
                const focusables = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusables || focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKey);
        setTimeout(() => {
            const firstInput = modalRef.current?.querySelector('input, button');
            firstInput?.focus();
        }, 0);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/profile'
                }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Google login failed');
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && currentStep < 3) {
            setCurrentStep(currentStep + 1);
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // AuthContext picks up the session automatically
                onClose();
                resetForm();
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            preferences,
                        }
                    }
                });
                if (error) throw error;

                if (data.user?.identities?.length === 0) {
                    throw new Error('An account with this email already exists');
                }

                // If email confirmation is enabled, Supabase returns a user but no active session yet.
                // In that case, do not mark user as logged in in the UI.
                if (!data.session) {
                    setError('Account created. Please confirm your email, then sign in.');
                    setIsLogin(true);
                    setCurrentStep(0);
                    return;
                }

                // Save profile to DB
                try {
                    await upsertProfile(data.user.id, {
                        name,
                        class_preferences: preferences,
                        style_preferences: [],
                    });
                } catch {}

                // AuthContext picks up the session automatically
                onClose();
                resetForm();
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Enter your email address first');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/profile',
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setPreferences([]);
        setCurrentStep(0);
        setError('');
        setForgotPassword(false);
        setResetSent(false);
        setShowPassword(false);
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    if (!isOpen) return null;

    return (
        <div className={`auth-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                className="auth-modal-container"
                onClick={(e) => e.stopPropagation()}
                ref={modalRef}
            >
                <div className="auth-modal-image-section">
                    <img
                        src={`${process.env.PUBLIC_URL}/images/logreg_pic.jpg`}
                        alt="World of Warcraft"
                        className="auth-modal-image"
                        onError={(e) => console.error('Image failed to load:', e)}
                        width="400"
                        height="600"
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                <div className="auth-modal-form-section">
                    <button className="auth-modal-close" onClick={onClose}>×</button>

                    <div className="auth-modal-content">
                        <div className="auth-modal-header">
                            <h2>{forgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                            <p className="auth-modal-subtitle">
                                {forgotPassword
                                    ? 'We\'ll send you a link to set a new password'
                                    : isLogin
                                        ? 'Sign in to your TransmogVault account'
                                        : 'Join the transmog community'}
                            </p>
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <button
                            type="button"
                            className="google-auth-btn"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                        </button>

                        <div className="auth-divider">
                            <span>or</span>
                        </div>

                        {!isLogin && (
                            <form onSubmit={handleSubmit} style={{width: '100%'}}>
                            <Stepper currentStep={currentStep}>
                                <Step label="Info">
                                    <div className="input-group">
                                        <IconUser />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                            required
                                        />
                                    </div>
                                </Step>

                                <Step label="Account">
                                    <div>
                                        <div className="input-group">
                                            <IconMail />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Email address"
                                                required
                                            />
                                        </div>

                                        <div className="input-group">
                                            <IconLock />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Password"
                                                required
                                            />
                                            <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                                {showPassword ? <IconEyeOff /> : <IconEye />}
                                            </button>
                                        </div>
                                        <p className="password-hint">Minimum 6 characters</p>
                                    </div>
                                </Step>

                                <Step label="Main">
                                    <div className="preferences-step">
                                        <p className="preferences-label">Pick your main class (up to 3)</p>
                                        <div className="preferences-grid main-class-grid">
                                            {[
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
                                            ].map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={`preference-chip ${preferences.includes(item.id) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setPreferences(prev => {
                                                            if (prev.includes(item.id)) {
                                                                return prev.filter(p => p !== item.id);
                                                            }
                                                            if (prev.length >= 3) return prev;
                                                            return [...prev, item.id];
                                                        });
                                                    }}
                                                >
                                                    <img
                                                        src={`https://wow.zamimg.com/images/wow/icons/medium/classicon_${item.id}.jpg`}
                                                        alt={item.label}
                                                        className="preference-icon"
                                                        loading="lazy"
                                                    />
                                                    <span className="preference-text">{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Step>

                                <Step label="Confirm">
                                    <div className="confirmation-step">
                                        <p><strong>Name</strong><br/>{name}</p>
                                        <p><strong>Email</strong><br/>{email}</p>
                                        {preferences.length > 0 && (
                                            <p><strong>Preferences</strong><br/>{preferences.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}</p>
                                        )}
                                    </div>
                                </Step>
                            </Stepper>

                            <div className="stepper-buttons">
                                {currentStep > 0 && (
                                    <button type="button" onClick={handleBack} className="back-btn">
                                        Back
                                    </button>
                                )}
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {currentStep === 3 ? (loading ? 'Creating...' : 'Create Account') : 'Continue'}
                                </button>
                            </div>
                            </form>
                        )}

                        {isLogin && !forgotPassword ? (
                            <form className="auth-form" onSubmit={handleSubmit}>
                                <div className="input-group">
                                    <IconMail />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email address"
                                        required
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="input-group">
                                    <IconLock />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>

                                <p className="forgot-password" onClick={() => { setForgotPassword(true); setError(''); }}>
                                    Forgot password?
                                </p>
                            </form>
                        ) : null}

                        {forgotPassword ? (
                            <form className="auth-form" onSubmit={handleForgotPassword}>
                                {resetSent ? (
                                    <div className="reset-sent-message">
                                        <p>Check your email for a password reset link.</p>
                                        <button type="button" className="submit-btn" onClick={() => { setForgotPassword(false); setResetSent(false); }}>
                                            Back to Sign In
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="auth-modal-subtitle" style={{ marginBottom: '12px' }}>
                                            Enter your email and we'll send you a reset link
                                        </p>
                                        <div className="input-group">
                                            <IconMail />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Email address"
                                                required
                                                autoComplete="email"
                                            />
                                        </div>
                                        <button type="submit" className="submit-btn" disabled={loading}>
                                            {loading ? 'Sending...' : 'Send Reset Link'}
                                        </button>
                                        <p className="forgot-password" onClick={() => { setForgotPassword(false); setError(''); }}>
                                            Back to Sign In
                                        </p>
                                    </>
                                )}
                            </form>
                        ) : null}

                        <p className="toggle-mode">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span onClick={toggleMode}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthModal;
