/**
 * Game Page
 * Main chess game view with board, player info, and game controls
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import { gameApi } from '../../api';
import useSocket from '../../hooks/useSocket';
import Tile from '../../components/Tile/Tile';
import ChessLogic from '../../utils/CheckMove';
import { INITIAL_BOARD, PIECE_IMAGES } from '../../utils/constants';
import './Game.css';

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
            setMessage(`Checkmate! ${winColor} wins!`);
        };
        const stalemateHandler = () => {
            setMessage("Stalemate! It's a draw.");
        };
        const opponentLeftHandler = () => {
            setMessage('Opponent disconnected.');
        };
        socket.on('receive-update-checkmate', checkmateHandler);
        socket.on('receive-update-stalemate', stalemateHandler);
        socket.on('opponent-left', opponentLeftHandler);
        return () => {
            socket.off('receive-update-checkmate', checkmateHandler);
            socket.off('receive-update-stalemate', stalemateHandler);
            socket.off('opponent-left', opponentLeftHandler);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;
        const receivePiecesHandler = (receivedPieces, nextTurn) => {
            setPieces(receivedPieces);
            setWhoseChanceItIs(nextTurn);
            setMessage('');
        };
        const loadBoardHandler = (data, turn, blackEmail, whiteEmail) => {
            setPieces(data);
            setWhoseChanceItIs(turn);
            setBMail(blackEmail);
            setWMail(whiteEmail);
        };
        socket.on('recieve-pieces', receivePiecesHandler);
        socket.on('load-chessboard', loadBoardHandler);
        return () => {
            socket.off('recieve-pieces', receivePiecesHandler);
            socket.off('load-chessboard', loadBoardHandler);
        };
    }, [socket]);

    useEffect(() => {
        if (bMail === user?.playerEmailId) setYourColor('black');
        if (wMail === user?.playerEmailId) setYourColor('white');
    }, [bMail, wMail, user]);

    useEffect(() => {
        if (!socket) return;
        const handler = (playerColor) => {
            setYourColor(playerColor);
            emit('save-my-color', user?.playerEmailId, playerColor);
        };
        socket.on('player-color', handler);
        return () => socket.off('player-color', handler);
    }, [socket, user?.playerEmailId, emit]);

    const handleDragStart = (e, piece) => {
        if (piece.color !== yourColor || whoseChanceItIs !== yourColor) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (chessLogic.isValidMove(piece.x, piece.y, r, c, pieces, yourColor)) {
                    moves.push({ x: r, y: c });
                }
            }
        }
        setActiveTile(moves);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, row, col) => {
        e.preventDefault();
        setActiveTile(null);
        if (!draggedPiece) return;

        const { x: fromX, y: fromY } = draggedPiece;

        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, yourColor)) {
            const isCastling = draggedPiece.type === 'king' && Math.abs(col - fromY) === 2;
            let castlingRookMove = null;
            if (isCastling) {
                const isKingSide = col > fromY;
                const rookCol = isKingSide ? 7 : 0;
                const rookDestCol = isKingSide ? 5 : 3;
                const rook = pieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
                if (rook) castlingRookMove = { rook, toCol: rookDestCol };
            }

            const newPieces = pieces
                .filter(p => !(p.x === row && p.y === col))
                .map(p => {
                    if (p.x === fromX && p.y === fromY) {
                        return { ...p, x: row, y: col, hasMoved: true };
                    }
                    if (castlingRookMove && p === castlingRookMove.rook) {
                        return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                    }
                    return p;
                });

            const movedPiece = newPieces.find(p => p.x === row && p.y === col);
            if (movedPiece && movedPiece.type === 'pawn') {
                if ((movedPiece.color === 'white' && row === 0) || (movedPiece.color === 'black' && row === 7)) {
                    movedPiece.type = 'queen';
                    movedPiece.image = movedPiece.color === 'white' ? PIECE_IMAGES.white.queen : PIECE_IMAGES.black.queen;
                }
            }

            setPieces(newPieces);
            const nextTurn = whoseChanceItIs === 'white' ? 'black' : 'white';
            setWhoseChanceItIs(nextTurn);

            const gameState = chessLogic.getGameState(nextTurn, newPieces);
            emit('send-pieces', newPieces, nextTurn);
            emit('save-chessboard', newPieces, nextTurn, user?.playerEmailId);

            if (gameState === 'checkmate') {
                emit('game-end-checkmate', nextTurn);
                setMessage("Checkmate! You won!");
            } else if (gameState === 'stalemate') {
                emit('game-end-stalemate');
                setMessage("Stalemate!");
            }
        }
        setDraggedPiece(null);
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
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            );
        }
    }

    const whitePawn = PIECE_IMAGES.white.pawn;
    const blackPawn = PIECE_IMAGES.black.pawn;
    const isMyTurn = whoseChanceItIs === yourColor;

    return (
        <div className="game-page">
            <div className="game-layout">
                {/* Board Section */}
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
                        <span className="game-rating">{opponentUser.playerRating}</span>
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
                        <span className="game-rating">{user?.playerRating || '—'}</span>
                    </div>
                </div>

                {/* Sidebar */}
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

                    <button className="game-exit-btn" onClick={handleExit}>Leave Game</button>
                </div>
            </div>
        </div>
    );
}
