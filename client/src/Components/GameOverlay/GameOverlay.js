/**
 * GameOverlay Component
 * Full-screen overlays for game start, victory, defeat, and draw scenarios
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './GameOverlay.css';

const CONFETTI_COLORS = ['#d4a843', '#f0d78c', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#fbbf24', '#14b8a6'];

function GameOverlay({ type, message, onDismiss }) {
    const [visible, setVisible] = useState(true);
    const [exiting, setExiting] = useState(false);

    const dismiss = useCallback(() => {
        if (exiting) return;
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            onDismiss?.();
        }, 500);
    }, [exiting, onDismiss]);

    useEffect(() => {
        setVisible(true);
        setExiting(false);
    }, [type]);

    useEffect(() => {
        if (type === 'start') {
            const timer = setTimeout(dismiss, 2200);
            return () => clearTimeout(timer);
        }
    }, [type, dismiss]);

    const confetti = useMemo(() => {
        if (type !== 'victory') return null;
        return Array.from({ length: 60 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2.5,
            duration: 2.5 + Math.random() * 3,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            width: 5 + Math.random() * 9,
            height: 4 + Math.random() * 6,
            rotation: Math.random() * 360,
        }));
    }, [type]);

    if (!visible || !type) return null;

    const isEndScreen = type !== 'start';

    return (
        <div
            className={`go-overlay go-${type} ${exiting ? 'go-exiting' : ''}`}
            onClick={isEndScreen ? dismiss : undefined}
        >
            {/* Ambient ring effect */}
            <div className="go-ring" />

            <div className="go-content">
                {type === 'start' && (
                    <>
                        <div className="go-icon go-icon-start">&#9822;</div>
                        <h1 className="go-title go-title-start">GAME ON</h1>
                        <p className="go-sub">Make your move, commander</p>
                    </>
                )}

                {type === 'victory' && (
                    <>
                        {confetti.map(c => (
                            <span
                                key={c.id}
                                className="go-confetti"
                                style={{
                                    left: `${c.left}%`,
                                    animationDelay: `${c.delay}s`,
                                    animationDuration: `${c.duration}s`,
                                    backgroundColor: c.color,
                                    width: `${c.width}px`,
                                    height: `${c.height}px`,
                                    transform: `rotate(${c.rotation}deg)`,
                                }}
                            />
                        ))}
                        <div className="go-icon go-icon-victory">&#9812;</div>
                        <h1 className="go-title go-title-victory">VICTORY</h1>
                        <p className="go-sub">{message || 'Checkmate! You win!'}</p>
                        <p className="go-hint">Click anywhere to continue</p>
                    </>
                )}

                {type === 'defeat' && (
                    <>
                        <div className="go-icon go-icon-defeat">&#9818;</div>
                        <h1 className="go-title go-title-defeat">DEFEAT</h1>
                        <p className="go-sub">{message || 'Checkmate. Better luck next time.'}</p>
                        <p className="go-hint">Click anywhere to continue</p>
                    </>
                )}

                {type === 'draw' && (
                    <>
                        <div className="go-icon go-icon-draw">&#189;</div>
                        <h1 className="go-title go-title-draw">DRAW</h1>
                        <p className="go-sub">{message || "Neither side could prevail."}</p>
                        <p className="go-hint">Click anywhere to continue</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(GameOverlay);
