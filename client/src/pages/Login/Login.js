/**
 * Login Page
 * Handles user login and registration
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import { authApi } from '../../api';
import usePanel from '../../hooks/usePanel';
import bg from '../../assets/images/1.jpg';
import './Login.css';

export default function Login() {
    const history = useHistory();
    const { isAuthenticated, login } = useAuth();
    const { containerRef, showRightPanel, showLeftPanel } = usePanel();

    // Registration form
    const [playerName, setPlayerName] = useState('');
    const [playerId, setPlayerId] = useState('');
    const [playerEmail, setPlayerEmail] = useState('');
    const [playerPassword, setPlayerPassword] = useState('');

    // Login form
    const [loginPlayerId, setLoginPlayerId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Redirect if already logged in
    if (isAuthenticated) {
        history.push('/chessgame');
        return null;
    }

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const result = await login(loginPlayerId, loginPassword);
            if (result.success) {
                history.push('/chessgame');
            } else {
                setLoginError(result.message || 'Login failed');
            }
        } catch (error) {
            setLoginError('Server error. Please try again.');
        }
    };

    return (
        <div
            className="login_screen"
            style={{ backgroundImage: `url(${bg})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}
        >
            <div ref={containerRef} id="container">
                {/* Registration Form */}
                <div className="form-container sign-up-container">
                    <form method="POST" action={authApi.getRegisterUrl()}>
                        <h1>Create Account</h1>
                        <input type="text" name="name" placeholder="Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
                        <input type="text" name="id" placeholder="Username" value={playerId} onChange={(e) => setPlayerId(e.target.value)} required />
                        <input type="email" name="email" placeholder="Email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} required />
                        <input type="password" name="password" placeholder="Password" value={playerPassword} onChange={(e) => setPlayerPassword(e.target.value)} required />
                        <button>Sign Up</button>
                    </form>
                </div>

                {/* Login Form */}
                <div className="form-container sign-in-container">
                    <form onSubmit={handleLoginSubmit}>
                        <h1>Sign in</h1>
                        <input type="text" name="id" placeholder="Username" value={loginPlayerId} onChange={(e) => setLoginPlayerId(e.target.value)} required />
                        <input type="password" name="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                        {loginError && <p style={{ color: 'red', fontSize: '14px' }}>{loginError}</p>}
                        <button>Sign In</button>
                    </form>
                </div>

                {/* Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>Welcome Back!</h1>
                            <p>To keep connected with us please login with your personal info</p>
                            <button className="ghost" onClick={showLeftPanel}>Sign In</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>Hello, Friend!</h1>
                            <p>Enter your personal details and start journey with us</p>
                            <button className="ghost" onClick={showRightPanel}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
