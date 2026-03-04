/**
 * Login Page
 * Handles user login and registration
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import { authApi } from '../../api';
import usePanel from '../../hooks/usePanel';
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
    const [registerError, setRegisterError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);

    // Login form
    const [loginPlayerId, setLoginPlayerId] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Redirect if already logged in
    if (isAuthenticated) {
        history.push('/chessgame');
        return null;
    }

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        try {
            const result = await login(loginPlayerId, loginPassword);
            if (result.success) {
                history.push('/chessgame');
            } else {
                setLoginError(result.message || 'Login failed');
            }
        } catch (error) {
            setLoginError('Something went wrong. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegisterError('');
        setRegisterSuccess('');
        setRegisterLoading(true);

        try {
            await authApi.register(playerName, playerId, playerEmail, playerPassword);
            setRegisterSuccess('Account created! You can now sign in.');
            setPlayerName('');
            setPlayerId('');
            setPlayerEmail('');
            setPlayerPassword('');
            setTimeout(() => showLeftPanel(), 1500);
        } catch (error) {
            const serverMessage = error.response?.data?.message;
            setRegisterError(serverMessage || 'Registration failed. Please try again.');
        } finally {
            setRegisterLoading(false);
        }
    };

    return (
        <div className="login_screen">
            <div ref={containerRef} className="panel-container">
                {/* Registration Form */}
                <div className="form-container sign-up-container">
                    <form className="auth-form" onSubmit={handleRegisterSubmit}>
                        <div className="chess-icon">&#9822;</div>
                        <h1>Create Account</h1>
                        <p className="subtitle">Join the battlefield</p>
                        <input className="auth-input" type="text" placeholder="Full Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
                        <input className="auth-input" type="text" placeholder="Username" value={playerId} onChange={(e) => setPlayerId(e.target.value)} required />
                        <input className="auth-input" type="email" placeholder="Email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} required />
                        <input className="auth-input" type="password" placeholder="Password" value={playerPassword} onChange={(e) => setPlayerPassword(e.target.value)} required />
                        {registerError && <p className="error-msg">{registerError}</p>}
                        {registerSuccess && <p className="success-msg">{registerSuccess}</p>}
                        <button className="auth-btn" type="submit" disabled={registerLoading}>
                            {registerLoading ? 'Creating...' : 'Sign Up'}
                        </button>
                        <button type="button" className="mobile-toggle" onClick={showLeftPanel}>Already have an account? Sign In</button>
                    </form>
                </div>

                {/* Login Form */}
                <div className="form-container sign-in-container">
                    <form className="auth-form" onSubmit={handleLoginSubmit}>
                        <div className="chess-icon">&#9818;</div>
                        <h1>Welcome Back</h1>
                        <p className="subtitle">Sign in to continue your game</p>
                        <input className="auth-input" type="text" placeholder="Username" value={loginPlayerId} onChange={(e) => setLoginPlayerId(e.target.value)} required />
                        <input className="auth-input" type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                        {loginError && <p className="error-msg">{loginError}</p>}
                        <button className="auth-btn" type="submit" disabled={loginLoading}>
                            {loginLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                        <button type="button" className="mobile-toggle" onClick={showRightPanel}>Don't have an account? Sign Up</button>
                    </form>
                </div>

                {/* Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>Welcome Back!</h1>
                            <p>Already have an account? Sign in and get back to the game.</p>
                            <button type="button" className="ghost-btn" onClick={showLeftPanel}>Sign In</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>New Here?</h1>
                            <p>Create an account and start playing chess with friends or against Stockfish AI.</p>
                            <button type="button" className="ghost-btn" onClick={showRightPanel}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
