import React, { useState, useEffect, useRef } from 'react';
import './AuthModal.css';
import Stepper, { Step } from './Stepper.jsx';

function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
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
        if (!isLogin && currentStep < 2) {
            setCurrentStep(currentStep + 1);
        } else {
            console.log({ name, email, password, isLogin });
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const resetForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setCurrentStep(0);
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
                        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>

                        {!isLogin && (
                            <Stepper currentStep={currentStep}>
                                <Step label="Personal Info">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your name"
                                            required
                                        />
                                    </div>
                                </Step>

                                <Step label="Account">
                                    <div>
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
                                    </div>
                                </Step>

                                <Step label="Confirm">
                                    <div className="confirmation-step">
                                        <p><strong>Name:</strong> {name}</p>
                                        <p><strong>Email:</strong> {email}</p>
                                    </div>
                                </Step>
                            </Stepper>
                        )}

                        {isLogin ? (
                            // ЛОГІН - окрема форма
                            <form className="auth-form" onSubmit={handleSubmit}>
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
                                    Login
                                </button>
                            </form>
                        ) : (
                            // РЕЄСТРАЦІЯ - кнопки
                            <div className="stepper-buttons">
                                {currentStep > 0 && (
                                    <button type="button" onClick={handleBack} className="back-btn">
                                        Back
                                    </button>
                                )}
                                <button type="button" onClick={handleSubmit} className="submit-btn">
                                    {currentStep === 2 ? 'Sign Up' : 'Next'}
                                </button>
                            </div>
                        )}

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