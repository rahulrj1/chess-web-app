/**
 * SinglePlayer Page
 * Play chess against Stockfish AI
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import useStockfish, { DIFFICULTY_LEVELS } from '../../hooks/useStockfish';
import Tile from '../../components/Tile/Tile';
import ChessLogic from '../../utils/CheckMove';
import { coordsToUci, uciToCoords, movesToPositionString } from '../../utils/moveConverter';
import { INITIAL_BOARD, PIECE_IMAGES } from '../../utils/constants';
import './SinglePlayer.css';

function getInitialBoard() {
    return INITIAL_BOARD.map(p => ({ ...p, hasMoved: false }));
}

export default function SinglePlayer() {
    const history = useHistory();
    const { user } = useAuth();

    const [pieces, setPieces] = useState(getInitialBoard);
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [activeTile, setActiveTile] = useState(null);
    const [whoseChanceItIs, setWhoseChanceItIs] = useState('white');
    const [message, setMessage] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [moveHistory, setMoveHistory] = useState([]);

    const [difficulty, setDifficulty] = useState('medium');
    const { isReady, isThinking, requestMove, resetEngine } = useStockfish(difficulty);

    const playerColor = 'white';
    const aiColor = 'black';

    const chessLogic = useRef(new ChessLogic()).current;
    const piecesRef = useRef(pieces);
    useEffect(() => { piecesRef.current = pieces; }, [pieces]);
    const moveHistoryRef = useRef(moveHistory);
    useEffect(() => { moveHistoryRef.current = moveHistory; }, [moveHistory]);

    const executeAiMove = useCallback((uciMove) => {
        const { fromX, fromY, toX, toY, promotion } = uciToCoords(uciMove);
        const currentPieces = piecesRef.current;
        const movingPiece = currentPieces.find(p => p.x === fromX && p.y === fromY);
        if (!movingPiece) return;

        const isCastling = movingPiece.type === 'king' && Math.abs(toY - fromY) === 2;
        let castlingRookMove = null;

        if (isCastling) {
            const isKingSide = toY > fromY;
            const rookCol = isKingSide ? 7 : 0;
            const rookDestCol = isKingSide ? 5 : 3;
            const rook = currentPieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
            if (rook) castlingRookMove = { rook, toCol: rookDestCol };
        }

        const newPieces = currentPieces
            .filter(p => !(p.x === toX && p.y === toY))
            .map(p => {
                if (p.x === fromX && p.y === fromY) {
                    const updated = { ...p, x: toX, y: toY, hasMoved: true };
                    if (promotion || (p.type === 'pawn' && (toX === 0 || toX === 7))) {
                        updated.type = 'queen';
                        updated.image = p.color === 'white' ? PIECE_IMAGES.white.queen : PIECE_IMAGES.black.queen;
                    }
                    return updated;
                }
                if (castlingRookMove && p === castlingRookMove.rook) {
                    return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                }
                return p;
            });

        setPieces(newPieces);
        const gameState = chessLogic.getGameState(playerColor, newPieces);
        if (gameState === 'checkmate') {
            setMessage("Checkmate! Stockfish wins.");
            setGameOver(true);
        } else if (gameState === 'stalemate') {
            setMessage("Stalemate! It's a draw.");
            setGameOver(true);
        } else if (chessLogic.isKingInCheck(playerColor, newPieces)) {
            setMessage("Check!");
        } else {
            setMessage('');
        }
        setMoveHistory(prev => [...prev, uciMove]);
        setWhoseChanceItIs(playerColor);
    }, [chessLogic, playerColor]);

    const triggerAiMove = useCallback((newMoveHistory) => {
        if (!isReady || gameOver) return;
        const position = movesToPositionString(newMoveHistory);
        requestMove(position, (uciMove) => {
            setTimeout(() => executeAiMove(uciMove), 300);
        });
    }, [isReady, gameOver, requestMove, executeAiMove]);

    const handleDragStart = (e, piece) => {
        if (piece.color !== playerColor || whoseChanceItIs !== playerColor || gameOver || isThinking) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (chessLogic.isValidMove(piece.x, piece.y, r, c, pieces, playerColor)) {
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

        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, playerColor)) {
            let promotion = '';
            if (draggedPiece.type === 'pawn' && (row === 0 || row === 7)) {
                promotion = 'q';
            }
            const uciMove = coordsToUci(fromX, fromY, row, col, promotion);

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
                        const updated = { ...p, x: row, y: col, hasMoved: true };
                        if (promotion) {
                            updated.type = 'queen';
                            updated.image = PIECE_IMAGES.white.queen;
                        }
                        return updated;
                    }
                    if (castlingRookMove && p === castlingRookMove.rook) {
                        return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                    }
                    return p;
                });

            setPieces(newPieces);
            const newHistory = [...moveHistoryRef.current, uciMove];
            setMoveHistory(newHistory);
            setWhoseChanceItIs(aiColor);

            const gameState = chessLogic.getGameState(aiColor, newPieces);
            if (gameState === 'checkmate') {
                setMessage("Checkmate! You win!");
                setGameOver(true);
            } else if (gameState === 'stalemate') {
                setMessage("Stalemate! It's a draw.");
                setGameOver(true);
            } else {
                setMessage('');
                triggerAiMove(newHistory);
            }
        }
        setDraggedPiece(null);
    };

    const handleNewGame = () => {
        setPieces(getInitialBoard());
        setWhoseChanceItIs('white');
        setMessage('');
        setGameOver(false);
        setMoveHistory([]);
        setActiveTile(null);
        resetEngine();
    };

    const board = [];
    for (let i = 0; i < 8; i++) {
        const row = i;
        for (let j = 0; j < 8; j++) {
            board.push(
                <Tile
                    key={`${row}-${j}`}
                    pieces={pieces}
                    row={row}
                    col={j}
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
        <div className="sp-page">
            <div className="sp-layout">
                {/* Board Section */}
                <div className="sp-board-section">
                    <div className="sp-player-bar">
                        <div className="sp-avatar">
                            <img src={blackPawn} alt="stockfish" />
                        </div>
                        <div className="sp-player-info">
                            <span className="sp-player-name">Stockfish</span>
                            <span className="sp-player-detail">
                                {isThinking ? 'Thinking...' : `Difficulty: ${difficulty}`}
                            </span>
                        </div>
                        {isThinking && <span className="sp-thinking-dot" />}
                    </div>

                    <div className="chessboard">{board}</div>

                    <div className="sp-player-bar">
                        <div className="sp-avatar">
                            <img src={whitePawn} alt="you" />
                        </div>
                        <div className="sp-player-info">
                            <span className="sp-player-name">{user?.playerName || 'Player'}</span>
                            <span className="sp-player-detail">Rating: {user?.playerRating || 1200}</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="sp-sidebar">
                    <div className="sp-status">
                        {message || (isThinking ? "Stockfish is thinking..." : `It's ${whoseChanceItIs}'s turn`)}
                    </div>

                    <div className="sp-controls-group">
                        <label className="sp-label">Difficulty</label>
                        <select
                            className="sp-select"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            disabled={moveHistory.length > 0 && !gameOver}
                        >
                            {Object.keys(DIFFICULTY_LEVELS).map(level => (
                                <option key={level} value={level}>
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sp-actions">
                        <button className="sp-btn primary" onClick={handleNewGame}>New Game</button>
                        <button className="sp-btn" onClick={() => history.push('/chessgame')}>Back</button>
                    </div>

                    {!isReady && <div className="sp-loading">Loading engine...</div>}
                </div>
            </div>
        </div>
    );
}
