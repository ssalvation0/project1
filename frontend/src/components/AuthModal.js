import React, { useState } from 'react';
import './AuthModal.css';

function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                {isLogin ? (
                    <form className="auth-form">
                        <input type="email" placeholder="Email" />
                        <input type="password" placeholder="Password" />
                        <button type="submit">Login</button>
                        <p className="auth-switch">
                            Don't have an account?{' '}
                            <span 
                                className="auth-link" 
                                onClick={() => setIsLogin(false)}
                            >
                                Register
                            </span>
                        </p>
                    </form>
                ) : (
                    <form className="auth-form">
                        <input type="text" placeholder="Name" />
                        <input type="email" placeholder="Email" />
                        <input type="password" placeholder="Password" />
                        <button type="submit">Register</button>
                        <p className="auth-switch">
                            Already have an account?{' '}
                            <span 
                                className="auth-link" 
                                onClick={() => setIsLogin(true)}
                            >
                                Login
                            </span>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AuthModal;