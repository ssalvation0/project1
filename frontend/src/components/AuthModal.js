import React, { useState, useEffect, useRef } from 'react';
import './AuthModal.css';
import Stepper, { Step } from './Stepper.jsx';


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
                // focus trap
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
        // move focus inside modal on open
        setTimeout(() => {
            const firstInput = modalRef.current?.querySelector('input, button');
            firstInput?.focus();
        }, 0);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content ${isLogin ? 'modal-login' : 'modal-register'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                ref={modalRef}
            >
                <div className="modal-left">
                    <img src="./images/logreg_pic.jpg" alt="Authentication" />
                </div>
                
                <div className="modal-right">
                    <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>

                    {isLogin ? (
                        <form className="auth-form">
                            <h2 id="auth-modal-title" style={{marginBottom: 10}}>Login</h2>
                            <input type="email" placeholder="Email" />
                            <input type="password" placeholder="Password" />
                            <button type="submit">Login</button>
                            <p className="auth-switch">
                                Don't have an account?{' '}
                                <span 
                                    className="auth-link" 
                                    onClick={() => setIsLogin(false)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    Register
                                </span>
                            </p>
                        </form>
                    ) : (
                        <div className = "auth-form" aria-labelledby="auth-modal-title">
                            <h2 id="auth-modal-title" style={{marginBottom: 10}}>Register</h2>
                            <Stepper
                                initialStep={1}
                                onStepChange={(step) => {
                                    console.log(step);
                                }}
                                onFinalStepCompleted={() => {
                                    console.log("Registration Completed!");
                                }}
                                backButtonText="Back"
                                nextButtonText="Next"
                            >
                                <Step>
                                    <h2>Welcome!</h2>
                                    <p>Lets get to know you.</p>
                                </Step>
                                <Step>
                                    <h2>What's your name?</h2>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </Step>
                                <Step>
                                    <h2>Your Email Address</h2>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </Step>
                                <Step>
                                    <h2>Create a Password</h2>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </Step>
                                <Step>
                                    <h2>All Set!</h2>
                                    <p>Click 'Complete' to finish your registration.</p>
                                </Step>
                            </Stepper>
                            <p className="auth-switch">
                                Already have an account?{' '}
                                <span
                                    className="auth-link"
                                    onClick={() => setIsLogin(true)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    Login
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthModal;