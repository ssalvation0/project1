import React, { useState } from 'react';
import './AuthModal.css';
import Stepper, { Step } from './Stepper.jsx';


function AuthModal({ isOpen, onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

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
                    <div className = "auth-form">
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
                            >
                                Login
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuthModal;