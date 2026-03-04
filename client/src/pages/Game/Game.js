/**
 * Game Page
 * Main chess game view with board, player info, and game controls
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import { gameApi } from '../../api';
import useSocket from '../../hooks/useSocket';
import Tile from '../../components/Tile/Tile';
import GameOverlay from '../../components/GameOverlay/GameOverlay';
import ChessLogic from '../../utils/CheckMove';
import { INITIAL_BOARD, PIECE_IMAGES } from '../../utils/constants';
import './Game.css';

const TIME_CONTROLS = {
    '5+3': { initial: 300, increment: 3, label: '5 + 3 Blitz' },
    '10+0': { initial: 600, increment: 0, label: '10 + 0 Rapid' },
    '15+10': { initial: 900, increment: 10, label: '15 + 10 Rapid' },
    '30+0': { initial: 1800, increment: 0, label: '30 min Classical' },
    'none': { initial: null, increment: 0, label: 'No Timer' },
};

function formatTime(seconds) {
    if (seconds == null) return '—';
    if (seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Game() {
    const { roomId } = useParams();
    const history = useHistory();
    const { user } = useAuth();

    const [pieces, setPieces] = useState(INITIAL_BOARD.map(p => ({ ...p, hasMoved: false })));
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [activeTile, setActiveTile] = useState(null);
    const [whoseChanceItIs, setWhoseChanceItIs] = useState('white');
    const [yourColor, setYourColor] = useState(null);
    const [message, setMessage] = useState('');
    const [enPassantTarget, setEnPassantTarget] = useState(null);
    const [moveHistory, setMoveHistory] = useState([]);
    const [pendingPromotion, setPendingPromotion] = useState(null);
    const [halfMoveClock, setHalfMoveClock] = useState(0);
    const [positionHistory, setPositionHistory] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [overlay, setOverlay] = useState({ type: null, message: '' });

    // Timer state
    const [timeControl, setTimeControl] = useState('5+3');
    const [whiteTime, setWhiteTime] = useState(TIME_CONTROLS['5+3'].initial);
    const [blackTime, setBlackTime] = useState(TIME_CONTROLS['5+3'].initial);
    const [timerStarted, setTimerStarted] = useState(false);
    const timerRef = useRef(null);

    const [opponentUser, setOpponentUser] = useState({
        playerName: 'Waiting...',
        playerId: '',
        playerEmailId: '',
        playerRating: '?',
    });

    const [bMail, setBMail] = useState('');
    const [wMail, setWMail] = useState('');

    const { socket, emit } = useSocket(roomId, pieces);
    const chessLogic = useRef(new ChessLogic()).current;
    const yourColorRef = useRef(yourColor);
    useEffect(() => { yourColorRef.current = yourColor; }, [yourColor]);

    // Timer countdown
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        const tc = TIME_CONTROLS[timeControl];
        if (!tc.initial || !timerStarted || gameOver) return;

        timerRef.current = setInterval(() => {
            if (whoseChanceItIs === 'white') {
                setWhiteTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        const msg = "Time's up! Black wins on time.";
                        setMessage(msg);
                        setGameOver(true);
                        setOverlay({ type: yourColorRef.current === 'black' ? 'victory' : 'defeat', message: msg });
                        emit('game-end-timeout', 'white');
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                setBlackTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        const msg = "Time's up! White wins on time.";
                        setMessage(msg);
                        setGameOver(true);
                        setOverlay({ type: yourColorRef.current === 'white' ? 'victory' : 'defeat', message: msg });
                        emit('game-end-timeout', 'black');
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [whoseChanceItIs, timerStarted, gameOver, timeControl, emit]);

    useEffect(() => {
        if (!socket || !user) return;
        emit('send-opponent-info', user);
    }, [user, opponentUser, socket, emit]);

    useEffect(() => {
        if (!socket) return;
        const handler = (oppo) => setOpponentUser(oppo);
        socket.on('recieve-opponent-info', handler);
        return () => socket.off('recieve-opponent-info', handler);
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const handler = () => {
            alert('Room is full!');
            history.push('/chessgame');
        };
        socket.on('room-full', handler);
        return () => socket.off('room-full', handler);
    }, [socket, history]);

    useEffect(() => {
        if (!socket) return;
        const checkmateHandler = (loseColor) => {
            const winColor = loseColor === 'black' ? 'white' : 'black';
            const msg = `Checkmate! ${winColor.charAt(0).toUpperCase() + winColor.slice(1)} wins!`;
            setMessage(msg);
            setGameOver(true);
            setOverlay(prev => {
                const iWon = winColor === yourColorRef.current;
                return { type: iWon ? 'victory' : 'defeat', message: msg };
            });
        };
        const stalemateHandler = () => {
            const msg = "Stalemate! It's a draw.";
            setMessage(msg);
            setGameOver(true);
            setOverlay({ type: 'draw', message: msg });
        };
        const drawHandler = (reason) => {
            const reasons = {
                'draw-insufficient': 'Draw — insufficient material.',
                'draw-fifty': 'Draw — fifty-move rule.',
                'draw-repetition': 'Draw — threefold repetition.',
            };
            const msg = reasons[reason] || "It's a draw.";
            setMessage(msg);
            setGameOver(true);
            setOverlay({ type: 'draw', message: msg });
        };
        const timeoutHandler = (loserColor) => {
            const winner = loserColor === 'white' ? 'Black' : 'White';
            const msg = `Time's up! ${winner} wins on time.`;
            setMessage(msg);
            setGameOver(true);
            setOverlay(prev => {
                const iWon = loserColor !== yourColorRef.current;
                return { type: iWon ? 'victory' : 'defeat', message: msg };
            });
        };
        const opponentLeftHandler = () => {
            setMessage('Opponent disconnected.');
        };
        const opponentReconnectedHandler = () => {
            setMessage(prev => prev === 'Opponent disconnected.' ? '' : prev);
        };
        socket.on('receive-update-checkmate', checkmateHandler);
        socket.on('receive-update-stalemate', stalemateHandler);
        socket.on('receive-update-draw', drawHandler);
        socket.on('receive-update-timeout', timeoutHandler);
        socket.on('opponent-left', opponentLeftHandler);
        socket.on('opponent-reconnected', opponentReconnectedHandler);
        return () => {
            socket.off('receive-update-checkmate', checkmateHandler);
            socket.off('receive-update-stalemate', stalemateHandler);
            socket.off('receive-update-draw', drawHandler);
            socket.off('receive-update-timeout', timeoutHandler);
            socket.off('opponent-left', opponentLeftHandler);
            socket.off('opponent-reconnected', opponentReconnectedHandler);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const receivePiecesHandler = (receivedPieces, nextTurn, receivedEp, uciMove, timerData) => {
            setPieces(receivedPieces);
            setWhoseChanceItIs(nextTurn);
            setEnPassantTarget(receivedEp || null);
            if (uciMove) {
                setMoveHistory(prev => [...prev, uciMove]);
                const coords = parseUciForLastMove(uciMove);
                if (coords) setLastMove(coords);
            }
            if (timerData) {
                setWhiteTime(timerData.whiteTime);
                setBlackTime(timerData.blackTime);
                if (!timerStarted) setTimerStarted(true);
            }
            setMessage('');
        };
        const loadBoardHandler = (data, turn, blackEmail, whiteEmail) => {
            setPieces(data);
            setWhoseChanceItIs(turn);
            setBMail(blackEmail);
            setWMail(whiteEmail);
        };
        const timeControlSyncHandler = (tc) => {
            if (tc && TIME_CONTROLS[tc]) {
                setTimeControl(tc);
                setWhiteTime(TIME_CONTROLS[tc].initial);
                setBlackTime(TIME_CONTROLS[tc].initial);
            }
        };
        socket.on('recieve-pieces', receivePiecesHandler);
        socket.on('load-chessboard', loadBoardHandler);
        socket.on('sync-time-control', timeControlSyncHandler);
        return () => {
            socket.off('recieve-pieces', receivePiecesHandler);
            socket.off('load-chessboard', loadBoardHandler);
            socket.off('sync-time-control', timeControlSyncHandler);
        };
    }, [socket, timerStarted]);

    useEffect(() => {
        if (bMail === user?.playerEmailId) setYourColor('black');
        if (wMail === user?.playerEmailId) setYourColor('white');
    }, [bMail, wMail, user]);

    useEffect(() => {
        if (!socket) return;
        const handler = (playerColor) => {
            setYourColor(playerColor);
            emit('save-my-color', user?.playerEmailId, playerColor);
            // First player (white) sets the time control for the room
            if (playerColor === 'white') {
                emit('set-time-control', timeControl);
            }
        };
        socket.on('player-color', handler);
        return () => socket.off('player-color', handler);
    }, [socket, user?.playerEmailId, emit, timeControl]);

    const handleTimeControlChange = (e) => {
        const tc = e.target.value;
        setTimeControl(tc);
        const ctrl = TIME_CONTROLS[tc];
        setWhiteTime(ctrl.initial);
        setBlackTime(ctrl.initial);
        emit('set-time-control', tc);
    };

    const handleDragStart = (e, piece) => {
        if (piece.color !== yourColor || whoseChanceItIs !== yourColor || pendingPromotion || gameOver) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (chessLogic.isValidMove(piece.x, piece.y, r, c, pieces, yourColor, enPassantTarget)) {
                    moves.push({ x: r, y: c });
                }
            }
        }
        setActiveTile(moves);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const executeMove = (fromX, fromY, row, col, promotionType) => {
        const movingPiece = pieces.find(p => p.x === fromX && p.y === fromY);
        if (!movingPiece) return;

        const isCapture = !!pieces.find(p => p.x === row && p.y === col);
        const isEnPassant = movingPiece.type === 'pawn' && enPassantTarget &&
            row === enPassantTarget.x && col === enPassantTarget.y;

        const isCastling = movingPiece.type === 'king' && Math.abs(col - fromY) === 2;
        let castlingRookMove = null;
        if (isCastling) {
            const isKingSide = col > fromY;
            const rookCol = isKingSide ? 7 : 0;
            const rookDestCol = isKingSide ? 5 : 3;
            const rook = pieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
            if (rook) castlingRookMove = { rook, toCol: rookDestCol };
        }

        let newPieces = pieces
            .filter(p => !(p.x === row && p.y === col))
            .map(p => {
                if (p.x === fromX && p.y === fromY) {
                    const updated = { ...p, x: row, y: col, hasMoved: true };
                    if (promotionType) {
                        const typeMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
                        updated.type = typeMap[promotionType] || 'queen';
                        updated.image = PIECE_IMAGES[movingPiece.color][updated.type];
                    }
                    return updated;
                }
                if (castlingRookMove && p === castlingRookMove.rook) {
                    return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                }
                return p;
            });

        if (isEnPassant) {
            const capturedRow = movingPiece.color === 'white' ? row + 1 : row - 1;
            newPieces = newPieces.filter(p => !(p.x === capturedRow && p.y === col));
        }

        let newEp = null;
        if (movingPiece.type === 'pawn' && Math.abs(row - fromX) === 2) {
            newEp = { x: (fromX + row) / 2, y: fromY };
        }
        setEnPassantTarget(newEp);

        const resetClock = movingPiece.type === 'pawn' || isCapture || isEnPassant;
        const newHmc = resetClock ? 0 : halfMoveClock + 1;
        setHalfMoveClock(newHmc);

        const nextTurn = whoseChanceItIs === 'white' ? 'black' : 'white';
        const posKey = chessLogic.generatePositionKey(newPieces, nextTurn, newEp);
        const newPosHist = [...positionHistory, posKey];
        setPositionHistory(newPosHist);

        const uciMove = `${String.fromCharCode(97 + fromY)}${8 - fromX}${String.fromCharCode(97 + col)}${8 - row}${promotionType || ''}`;

        // Apply increment to the moving player's clock
        const tc = TIME_CONTROLS[timeControl];
        let newWhiteTime = whiteTime;
        let newBlackTime = blackTime;
        if (tc.initial) {
            if (whoseChanceItIs === 'white') {
                newWhiteTime = whiteTime + tc.increment;
                setWhiteTime(newWhiteTime);
            } else {
                newBlackTime = blackTime + tc.increment;
                setBlackTime(newBlackTime);
            }
            if (!timerStarted) setTimerStarted(true);
        }

        setPieces(newPieces);
        setLastMove({ fromX, fromY, toX: row, toY: col });
        setMoveHistory(prev => [...prev, uciMove]);
        setWhoseChanceItIs(nextTurn);

        const timerData = tc.initial ? { whiteTime: newWhiteTime, blackTime: newBlackTime } : null;
        const drawState = { halfMoveClock: newHmc, positionHistory: newPosHist };
        const gameState = chessLogic.getGameState(nextTurn, newPieces, newEp, drawState);
        emit('send-pieces', newPieces, nextTurn, newEp, uciMove, timerData);
        emit('save-chessboard', newPieces, nextTurn, user?.playerEmailId);

        if (gameState === 'checkmate') {
            emit('game-end-checkmate', nextTurn);
            const winner = nextTurn === 'white' ? 'Black' : 'White';
            const msg = `Checkmate! ${winner} wins!`;
            setMessage(msg);
            setGameOver(true);
            setOverlay({ type: 'victory', message: msg });
        } else if (gameState === 'stalemate') {
            emit('game-end-stalemate');
            const msg = "Stalemate! It's a draw.";
            setMessage(msg);
            setGameOver(true);
            setOverlay({ type: 'draw', message: msg });
        } else if (gameState.startsWith('draw-')) {
            emit('game-end-draw', gameState);
            const reasons = {
                'draw-insufficient': 'Draw — insufficient material.',
                'draw-fifty': 'Draw — fifty-move rule.',
                'draw-repetition': 'Draw — threefold repetition.',
            };
            const msg = reasons[gameState] || "It's a draw.";
            setMessage(msg);
            setGameOver(true);
            setOverlay({ type: 'draw', message: msg });
        }
    };

    const handleDrop = (e, row, col) => {
        e.preventDefault();
        setActiveTile(null);
        if (!draggedPiece) return;

        const { x: fromX, y: fromY } = draggedPiece;

        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, yourColor, enPassantTarget)) {
            if (draggedPiece.type === 'pawn' && (row === 0 || row === 7)) {
                setPendingPromotion({ fromX, fromY, row, col });
                setDraggedPiece(null);
                return;
            }
            executeMove(fromX, fromY, row, col, '');
        }
        setDraggedPiece(null);
    };

    const handlePromotionChoice = (type) => {
        if (!pendingPromotion) return;
        const { fromX, fromY, row, col } = pendingPromotion;
        executeMove(fromX, fromY, row, col, type);
        setPendingPromotion(null);
    };

    const handleExit = () => {
        if (window.confirm("Are you sure you want to leave the game?")) {
            gameApi.deleteBoard(roomId).catch(console.error);
            emit('user-left');
            history.push('/chessgame');
        }
    };

    const isBlack = yourColor === 'black';
    const board = [];
    for (let i = 0; i < 8; i++) {
        const row = isBlack ? i : 7 - i;
        for (let j = 0; j < 8; j++) {
            const col = isBlack ? 7 - j : j;
            board.push(
                <Tile
                    key={`${row}-${col}`}
                    pieces={pieces}
                    row={row}
                    col={col}
                    activeTile={activeTile}
                    lastMove={lastMove}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    showCoords={true}
                    isBottom={i === 7}
                    isLeft={j === 0}
                />
            );
        }
    }

    const whitePawn = PIECE_IMAGES.white.pawn;
    const blackPawn = PIECE_IMAGES.black.pawn;
    const isMyTurn = whoseChanceItIs === yourColor;
    const tc = TIME_CONTROLS[timeControl];

    // Top bar = opponent, bottom bar = you
    const opponentColor = yourColor === 'white' ? 'black' : 'white';
    const opponentTime = opponentColor === 'white' ? whiteTime : blackTime;
    const myTime = yourColor === 'white' ? whiteTime : blackTime;

    return (
        <div className="game-page">
            <div className="game-layout">
                <div className="game-board-section">
                    <div className={`game-player-bar ${!isMyTurn ? 'active-turn' : ''}`}>
                        <div className="game-avatar">
                            <img src={yourColor === 'black' ? whitePawn : blackPawn} alt="opponent" />
                        </div>
                        <div className="game-player-info">
                            <span className="game-player-name">{opponentUser.playerName}</span>
                            <span className="game-player-detail">
                                {opponentUser.playerId ? `@${opponentUser.playerId}` : 'Waiting for opponent...'}
                            </span>
                        </div>
                        {tc.initial && (
                            <span className={`game-timer ${!isMyTurn ? 'timer-active' : ''} ${opponentTime <= 30 ? 'timer-low' : ''}`}>
                                {formatTime(opponentTime)}
                            </span>
                        )}
                        {!tc.initial && <span className="game-rating">{opponentUser.playerRating}</span>}
                    </div>

                    <div className="chessboard">{board}</div>

                    <div className={`game-player-bar ${isMyTurn ? 'active-turn' : ''}`}>
                        <div className="game-avatar">
                            <img src={yourColor === 'white' ? whitePawn : blackPawn} alt="you" />
                        </div>
                        <div className="game-player-info">
                            <span className="game-player-name">{user?.playerName || 'You'}</span>
                            <span className="game-player-detail">@{user?.playerId}</span>
                        </div>
                        {tc.initial && (
                            <span className={`game-timer ${isMyTurn ? 'timer-active' : ''} ${myTime <= 30 ? 'timer-low' : ''}`}>
                                {formatTime(myTime)}
                            </span>
                        )}
                        {!tc.initial && <span className="game-rating">{user?.playerRating || '—'}</span>}
                    </div>
                </div>

                <div className="game-sidebar">
                    <div className="game-status">
                        {message || (
                            <>
                                {whoseChanceItIs
                                    ? <>{whoseChanceItIs.charAt(0).toUpperCase() + whoseChanceItIs.slice(1)}'s turn</>
                                    : 'Connecting...'}
                                {chessLogic.isKingInCheck(whoseChanceItIs, pieces) &&
                                    <span className="game-check-alert"> — Check!</span>}
                            </>
                        )}
                    </div>

                    <div className="game-room-info">
                        <span className="game-room-label">Room</span>
                        <span className="game-room-code">{roomId}</span>
                    </div>

                    {yourColor && (
                        <div className="game-color-badge">
                            Playing as <strong>{yourColor}</strong>
                        </div>
                    )}

                    {/* Time control selector — only before first move */}
                    {yourColor === 'white' && moveHistory.length === 0 && !gameOver && (
                        <div className="game-time-control">
                            <span className="game-tc-label">Time Control</span>
                            <select className="game-tc-select" value={timeControl} onChange={handleTimeControlChange}>
                                {Object.entries(TIME_CONTROLS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {moveHistory.length > 0 && (
                        <div className="game-history">
                            <span className="game-history-label">Moves</span>
                            <div className="move-list">
                                {moveHistory.reduce((rows, move, i) => {
                                    if (i % 2 === 0) rows.push([move]);
                                    else rows[rows.length - 1].push(move);
                                    return rows;
                                }, []).map((pair, i) => (
                                    <div key={i} className="move-row">
                                        <span className="move-num">{i + 1}.</span>
                                        <span className="move-white">{pair[0]}</span>
                                        {pair[1] && <span className="move-black">{pair[1]}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button className="game-exit-btn" onClick={handleExit}>Leave Game</button>
                </div>
            </div>

            {pendingPromotion && (
                <div className="promotion-overlay">
                    <div className="promotion-modal">
                        <p>Promote pawn to:</p>
                        <div className="promotion-options">
                            {['queen', 'rook', 'bishop', 'knight'].map(type => (
                                <button key={type} className="promotion-piece" onClick={() => handlePromotionChoice(type[0])}>
                                    <img src={PIECE_IMAGES[yourColor][type]} alt={type} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {overlay.type && (
                <GameOverlay
                    type={overlay.type}
                    message={overlay.message}
                    onDismiss={() => setOverlay({ type: null, message: '' })}
                />
            )}
        </div>
    );
}

function parseUciForLastMove(uci) {
    if (!uci || uci.length < 4) return null;
    return {
        fromX: 8 - parseInt(uci[1]),
        fromY: uci.charCodeAt(0) - 97,
        toX: 8 - parseInt(uci[3]),
        toY: uci.charCodeAt(2) - 97,
    };
}
