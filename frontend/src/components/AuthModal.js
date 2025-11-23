import React, { useState, useEffect, useRef } from 'react';
import './AuthModal.css';

function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

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

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({ name, email, password, isLogin });
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
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
                    />
                </div>

                <div className="auth-modal-form-section">
                    <button className="auth-modal-close" onClick={onClose}>×</button>
                    
                    <div className="auth-modal-content">
                        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
                        
                        <form className="auth-form" onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div className="form-group">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                            )}
                            
                            <div className="form-group">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">    
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                            
                            <button type="submit" className="submit-btn">
                                {isLogin ? 'Login' : 'Sign Up'}
                            </button>
                        </form>
                        
                        <p className="toggle-mode">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <span onClick={toggleMode}>
                                {isLogin ? 'Sign Up' : 'Login'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthModal;