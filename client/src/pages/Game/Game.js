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
import ChessLogic from '../../utils/CheckMove';
import { HORIZONTAL_AXIS, VERTICAL_AXIS, INITIAL_BOARD, TILE_SIZE, PIECE_IMAGES } from '../../utils/constants';
import './Game.css';

export default function Game() {
    const { roomId } = useParams();
    const history = useHistory();
    const { user } = useAuth();

    // Initialize with hasMoved: false
    const [pieces, setPieces] = useState(INITIAL_BOARD.map(p => ({ ...p, hasMoved: false })));
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [activeTile, setActiveTile] = useState(null); // For highlighting valid moves
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

    // Send our info to opponent
    useEffect(() => {
        if (!socket || !user) return;
        emit('send-opponent-info', user);
    }, [user, opponentUser, socket, emit]);

    // Receive opponent info
    useEffect(() => {
        if (!socket) return;
        const handler = (oppo) => setOpponentUser(oppo);
        socket.on('recieve-opponent-info', handler);
        return () => socket.off('recieve-opponent-info', handler);
    }, [socket]);

    // Room full handler
    useEffect(() => {
        if (!socket) return;
        const handler = () => {
            alert('Room is full!');
            history.push('/chessgame');
        };
        socket.on('room-full', handler);
        return () => socket.off('room-full', handler);
    }, [socket, history]);

    // Checkmate/Stalemate handlers
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

    // Sync game state
    useEffect(() => {
        if (!socket) return;

        const receivePiecesHandler = (receivedPieces, nextTurn) => {
            setPieces(receivedPieces);
            setWhoseChanceItIs(nextTurn);
            setMessage(''); // Clear check message on new move
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

    // Determine color
    useEffect(() => {
        if (bMail === user?.playerEmailId) setYourColor('black');
        if (wMail === user?.playerEmailId) setYourColor('white');
    }, [bMail, wMail, user]);

    // Receive assigned color
    useEffect(() => {
        if (!socket) return;
        const handler = (playerColor) => {
            setYourColor(playerColor);
            emit('save-my-color', user?.playerEmailId, playerColor);
        };
        socket.on('player-color', handler);
        return () => socket.off('player-color', handler);
    }, [socket, user?.playerEmailId, emit]);

    // Drag Handlers
    const handleDragStart = (e, piece) => {
        // Validation: Only allow dragging own pieces on own turn
        if (piece.color !== yourColor || whoseChanceItIs !== yourColor) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);
        
        // Highlight valid moves
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

    const handleDragOver = (e, row, col) => {
        e.preventDefault(); // Allow drop
    };

    const handleDrop = (e, row, col) => {
        e.preventDefault();
        setActiveTile(null); // Clear highlights
        
        if (!draggedPiece) return;

        const { x: fromX, y: fromY } = draggedPiece;
        
        // Validate move using updated logic
        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, yourColor)) {
            // Check for Castling
            const isCastling = draggedPiece.type === 'king' && Math.abs(col - fromY) === 2;
            let castlingRookMove = null;

            if (isCastling) {
                const isKingSide = col > fromY;
                const rookCol = isKingSide ? 7 : 0;
                const rookDestCol = isKingSide ? 5 : 3;
                const rook = pieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
                if (rook) {
                    castlingRookMove = { rook, toCol: rookDestCol };
                }
            }

            // Execute move
            const newPieces = pieces
                .filter(p => !(p.x === row && p.y === col)) // Remove captured piece at destination
                .map(p => {
                    // Move dragged piece
                    if (p.x === fromX && p.y === fromY) {
                        return { ...p, x: row, y: col, hasMoved: true }; 
                    }
                    // Move Rook if castling
                    if (castlingRookMove && p === castlingRookMove.rook) {
                        return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                    }
                    return p;
                });

            // Handle Promotion (Auto-Queen for now)
            const movedPiece = newPieces.find(p => p.x === row && p.y === col);
            if (movedPiece && movedPiece.type === 'pawn') {
                if ((movedPiece.color === 'white' && row === 0) || (movedPiece.color === 'black' && row === 7)) {
                    movedPiece.type = 'queen';
                    movedPiece.image = movedPiece.color === 'white' ? PIECE_IMAGES.white.queen : PIECE_IMAGES.black.queen;
                }
            }

            // Update local state
            setPieces(newPieces);
            const nextTurn = whoseChanceItIs === 'white' ? 'black' : 'white';
            setWhoseChanceItIs(nextTurn);
            
            // Check Game Over conditions for opponent
            const gameState = chessLogic.getGameState(nextTurn, newPieces);
            
            // Sync with server
            emit('send-pieces', newPieces, nextTurn);
            emit('save-chessboard', newPieces, nextTurn, user?.playerEmailId);

            if (gameState === 'checkmate') {
                emit('game-end-checkmate', nextTurn); // nextTurn lost
                setMessage("Checkmate! You won!");
            } else if (gameState === 'stalemate') {
                emit('game-end-stalemate');
                setMessage("Stalemate!");
            }
        }
        
        setDraggedPiece(null);
    };

    // Exit game
    const handleExit = () => {
        if (window.confirm("Are you sure you want to leave the game?")) {
            gameApi.deleteBoard(roomId).catch(console.error);
            emit('user-left');
            history.push('/chessgame');
        }
    };

    // Render Board
    const isBlack = yourColor === 'black';
    const board = [];

    // Render board based on player color (perspective)
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

    return (
        <div className="chessboard_wrapper">
            {/* Opponent Info */}
            <div className="opponentinfo" style={{ backgroundColor: 'white' }}>
                <div className="card">
                    <div className="img">
                        <img src={yourColor === 'black' ? whitePawn : blackPawn} alt="opponent" />
                    </div>
                    <div className="infos">
                        <div className="name">
                            <h1>{opponentUser.playerName}</h1>
                            <h3>@{opponentUser.playerId || '...'}</h3>
                        </div>
                        <h2>Rating: {opponentUser.playerRating}</h2>
                    </div>
                </div>
            </div>

            {/* Chessboard */}
            <div className="chessboard">
                {board}
            </div>

            {/* Player Info */}
            <div className="myinfo" style={{ backgroundColor: 'white' }}>
                <div className="card">
                    <div className="img">
                        <img src={yourColor === 'white' ? whitePawn : blackPawn} alt="you" />
                    </div>
                    <div className="infos">
                        <div className="name">
                            <h1>{user?.playerName}</h1>
                            <h3>@{user?.playerId}</h3>
                        </div>
                        <h2>Rating: {user?.playerRating}</h2>
                    </div>
                </div>
                <button className="button" onClick={handleExit}>Exit Game</button>
            </div>

            {/* Status Bar */}
            <div className="messagebox" style={{ backgroundColor: 'white' }}>
                <div className="status-text">
                    {message || (
                        <>
                            Turn: <strong>{whoseChanceItIs ? whoseChanceItIs.toUpperCase() : '...'}</strong>
                            {chessLogic.isKingInCheck(whoseChanceItIs, pieces) && <span className="check-alert"> (CHECK!)</span>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
