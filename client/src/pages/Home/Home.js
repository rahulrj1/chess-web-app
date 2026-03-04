/**
 * Home Page
 * Dashboard for starting/joining games and viewing profile
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import usePanel from '../../hooks/usePanel';
import generateId from '../../utils/random';
import './Home.css';

export default function Home() {
    const history = useHistory();
    const { user, logout } = useAuth();
    const { containerRef, showRightPanel, showLeftPanel } = usePanel();

    const [gameCode, setGameCode] = useState('');

    const handleStartClick = (e) => {
        e.preventDefault();
        if (gameCode === '') return;
        history.push(`/chess/${gameCode}`);
    };

    const handleRandomJoin = (e) => {
        e.preventDefault();
        history.push(`/chess/${generateId(6)}`);
    };

    const handleLogout = () => {
        logout();
        history.push('/');
    };

    return (
        <div className="home_screen">
            <div className="bg-chess-pattern" />
            <div className="bg-glow bg-glow-1" />
            <div className="bg-glow bg-glow-2" />

            <div ref={containerRef} className="panel-container">
                {/* Profile Panel */}
                <div className="form-container sign-up-container">
                    <div className="panel-content">
                        <div className="form-header">
                            <span className="form-icon">&#9818;</span>
                            <h1>Profile</h1>
                            <p className="form-subtitle">Your kingdom stats</p>
                        </div>
                        <div className="profile-stats">
                            <div className="stat-row">
                                <span className="stat-label">Name</span>
                                <span className="stat-value">{user?.playerName || '—'}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Username</span>
                                <span className="stat-value">{user?.playerId || '—'}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Email</span>
                                <span className="stat-value">{user?.playerEmailId || '—'}</span>
                            </div>
                        </div>
                        <div className="rating-display">
                            <span className="rating-star">&#9733;</span>
                            <span className="rating-number">{user?.playerRating || 1200}</span>
                            <span className="rating-label">ELO</span>
                        </div>

                        <div className="mobile-nav">
                            <button className="mobile-nav-btn" onClick={showLeftPanel}>Play</button>
                            <button className="mobile-nav-btn" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>

                {/* Game Panel */}
                <div className="form-container sign-in-container">
                    <div className="panel-content">
                        <div className="form-header">
                            <span className="form-icon">&#9822;</span>
                            <h1>Play Chess</h1>
                            <p className="form-subtitle">Choose your battleground</p>
                        </div>
                        <div className="game-modes">
                            <button className="mode-btn primary" onClick={() => history.push('/play/ai')}>
                                <span className="mode-icon">&#9823;</span>
                                <div className="mode-info">
                                    <span className="mode-title">Play vs AI</span>
                                    <span className="mode-desc">Challenge the Stockfish engine</span>
                                </div>
                            </button>
                            <button className="mode-btn" onClick={handleRandomJoin}>
                                <span className="mode-icon">&#9876;</span>
                                <div className="mode-info">
                                    <span className="mode-title">Random Match</span>
                                    <span className="mode-desc">Find an opponent instantly</span>
                                </div>
                            </button>
                        </div>
                        <div className="room-divider">or enter a room code</div>
                        <div className="room-join">
                            <input
                                className="room-input"
                                type="text"
                                value={gameCode}
                                placeholder="Room code"
                                onChange={(e) => setGameCode(e.target.value)}
                            />
                            <button className="join-btn" onClick={handleStartClick}>Join</button>
                        </div>

                        <div className="mobile-nav">
                            <button className="mobile-nav-btn" onClick={showRightPanel}>Profile</button>
                            <button className="mobile-nav-btn" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>

                {/* Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <span className="overlay-piece">&#9813;</span>
                            <h1>Ready to Play?</h1>
                            <p>Challenge AI, join random matches, or invite friends to a private room.</p>
                            <button className="ghost-btn" onClick={showLeftPanel}>Start Game</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <span className="overlay-piece">&#9818;</span>
                            <h1>Your Kingdom</h1>
                            <p>View your profile, rating, and track your progress.</p>
                            <button className="ghost-btn" onClick={showRightPanel}>Profile</button>
                            <button className="ghost-btn logout" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
