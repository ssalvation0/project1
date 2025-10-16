import React, { useState } from 'react';
import './AuthModal.css';

function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>*</button>
                
                <div className="modal-tabs">
                    <button
                        className={isLogin ? 'tab active' : 'tab'}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button
                        className={!isLogin ? 'tab active' : 'tab'}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </button>
                </div>

                {isLogin ? (
                    <form className="auth-form">
                        <input type="email" placeholder="Email" />
                        <input type="password" placeholder="Password" />
                        <button type="submit">Login</button>
                    </form>
                ) : (
                    <form className="auth-form">
                        <input type="text" placeholder="Name" />
                        <input type="email" placeholder="Email" />
                        <input type="password" placeholder="Password" />
                        <button type="submit">Register</button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AuthModal;