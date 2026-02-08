/**
 * Home Page
 * Dashboard for starting/joining games and viewing profile
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import usePanel from '../../hooks/usePanel';
import generateId from '../../utils/random';
import bg from '../../assets/images/1.jpg';
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
        <div
            className="home_screen"
            style={{ backgroundImage: `url(${bg})`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}
        >
            <div ref={containerRef} id="container">
                {/* Profile Panel */}
                <div className="form-container sign-up-container">
                    <form>
                        <h1>Account Detail</h1>
                        <br /><br />
                        <h2>Name : {user?.playerName}</h2>
                        <h2>Username : {user?.playerId}</h2>
                        <h2>Email : {user?.playerEmailId}</h2>
                        <br />
                        <h2>Rating : {user?.playerRating}</h2>
                    </form>
                </div>

                {/* Game Panel */}
                <div className="form-container sign-in-container">
                    <form>
                        <h1>Start Game</h1>
                        <br />
                        <button onClick={() => history.push('/play/ai')}>Play vs AI</button>
                        <br /><br />
                        <button onClick={handleRandomJoin}>Join Random GAME</button>
                        <br /><br />
                        <input
                            type="text"
                            value={gameCode}
                            placeholder="Enter New Room or enter Friend's code"
                            onChange={(e) => setGameCode(e.target.value)}
                            required
                        />
                        <br />
                        <button onClick={handleStartClick}>Start New Game</button>
                        <br /><br />
                    </form>
                </div>

                {/* Overlay */}
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>Join Battle</h1>
                            <p>Enter unique Code to start New Game or Join Friend's Game with Game code</p>
                            <button className="ghost" onClick={showLeftPanel}>Start Game</button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>User Details</h1>
                            <p>View your personal details</p>
                            <button className="ghost" onClick={showRightPanel}>Profile</button>
                            <br />
                            <button className="ghost" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
