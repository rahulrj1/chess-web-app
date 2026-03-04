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
            <div ref={containerRef} className="panel-container">
                {/* Profile Panel */}
                <div className="form-container sign-up-container">
                    <div className="panel-content">
                        <div className="chess-icon">&#9818;</div>
                        <h1>Profile</h1>
                        <p className="subtitle">Your account details</p>
                        <div className="profile-details">
                            <div className="profile-row">
                                <span className="label">Name</span>
                                <span className="value">{user?.playerName || '—'}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Username</span>
                                <span className="value">{user?.playerId || '—'}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Email</span>
                                <span className="value">{user?.playerEmailId || '—'}</span>
                            </div>
                        </div>
                        <div className="rating-badge">
                            &#9733; Rating: {user?.playerRating || 1200}
                        </div>
                    </div>
                </div>

                {/* Game Panel */}
                <div className="form-container sign-in-container">
                    <div className="panel-content">
                        <div className="chess-icon">&#9822;</div>
                        <h1>Play Chess</h1>
                        <p className="subtitle">Choose your game mode</p>
                        <div className="game-actions">
                            <button className="action-btn primary" onClick={() => history.push('/play/ai')}>
                                &#9817; Play vs AI
                            </button>
                            <button className="action-btn secondary" onClick={handleRandomJoin}>
                                &#9812; Random Match
                            </button>
                            <div className="divider">or join a room</div>
                            <div className="room-group">
                                <input
                                    className="room-input"
                                    type="text"
                                    value={gameCode}
                                    placeholder="Enter room code"
                                    onChange={(e) => setGameCode(e.target.value)}
                                />
                                <button className="join-btn" onClick={handleStartClick}>
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>&#9813; Play</h1>
                            <p>Start a new game, play against AI, or challenge a friend with a room code.</p>
                            <button className="ghost-btn" onClick={showLeftPanel}>Start Game</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>&#9818; Your Profile</h1>
                            <p>View your stats and account details.</p>
                            <button className="ghost-btn" onClick={showRightPanel}>Profile</button>
                            <button className="ghost-btn logout" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
