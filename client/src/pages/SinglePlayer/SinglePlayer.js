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
import { HORIZONTAL_AXIS, VERTICAL_AXIS, INITIAL_BOARD, TILE_SIZE, PIECE_IMAGES } from '../../utils/constants';
import './SinglePlayer.css';

// Deep clone the initial board so each game starts fresh
function getInitialBoard() {
    return INITIAL_BOARD.map(p => ({ ...p, hasMoved: false }));
}

export default function SinglePlayer() {
    const history = useHistory();
    const { user } = useAuth();

    // Game state
    const [pieces, setPieces] = useState(getInitialBoard);
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [activeTile, setActiveTile] = useState(null);
    const [whoseChanceItIs, setWhoseChanceItIs] = useState('white');
    const [message, setMessage] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [moveHistory, setMoveHistory] = useState([]);

    // Difficulty
    const [difficulty, setDifficulty] = useState('medium');
    const { isReady, isThinking, requestMove, resetEngine } = useStockfish(difficulty);

    const playerColor = 'white'; // Player always plays white
    const aiColor = 'black';

    const chessLogic = useRef(new ChessLogic()).current;

    // Ref to hold latest pieces (avoids stale closure in AI callback)
    const piecesRef = useRef(pieces);
    useEffect(() => { piecesRef.current = pieces; }, [pieces]);

    const moveHistoryRef = useRef(moveHistory);
    useEffect(() => { moveHistoryRef.current = moveHistory; }, [moveHistory]);

    /**
     * Execute AI move on the board
     */
    const executeAiMove = useCallback((uciMove) => {
        const { fromX, fromY, toX, toY, promotion } = uciToCoords(uciMove);
        const currentPieces = piecesRef.current;

        const movingPiece = currentPieces.find(p => p.x === fromX && p.y === fromY);
        
        if (!movingPiece) return;

        // Check for castling
        const isCastling = movingPiece.type === 'king' && Math.abs(toY - fromY) === 2;
        let castlingRookMove = null;

        if (isCastling) {
            const isKingSide = toY > fromY;
            const rookCol = isKingSide ? 7 : 0;
            const rookDestCol = isKingSide ? 5 : 3;
            const rook = currentPieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
            if (rook) {
                castlingRookMove = { rook, toCol: rookDestCol };
            }
        }

        const newPieces = currentPieces
            .filter(p => !(p.x === toX && p.y === toY)) // Remove captured piece
            .map(p => {
                // Move King/Piece
                if (p.x === fromX && p.y === fromY) {
                    const updated = { ...p, x: toX, y: toY, hasMoved: true };
                    // Handle promotion
                    if (promotion || (p.type === 'pawn' && (toX === 0 || toX === 7))) {
                        updated.type = 'queen';
                        updated.image = p.color === 'white' ? PIECE_IMAGES.white.queen : PIECE_IMAGES.black.queen;
                    }
                    return updated;
                }
                // Move Rook for Castling
                if (castlingRookMove && p === castlingRookMove.rook) {
                    return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                }
                return p;
            });

        setPieces(newPieces);
        
        // Check game state after AI move
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

    /**
     * Request Stockfish to make a move
     */
    const triggerAiMove = useCallback((newMoveHistory) => {
        if (!isReady || gameOver) return;

        const position = movesToPositionString(newMoveHistory);
        requestMove(position, (uciMove) => {
            // Small delay so the player can see the move
            setTimeout(() => executeAiMove(uciMove), 300);
        });
    }, [isReady, gameOver, requestMove, executeAiMove]);

    // Drag Handlers
    const handleDragStart = (e, piece) => {
        if (piece.color !== playerColor || whoseChanceItIs !== playerColor || gameOver || isThinking) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);

        // Highlight valid moves
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

    const handleDragOver = (e, row, col) => {
        e.preventDefault();
    };

    const handleDrop = (e, row, col) => {
        e.preventDefault();
        setActiveTile(null);

        if (!draggedPiece) return;

        const { x: fromX, y: fromY } = draggedPiece;

        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, playerColor)) {
            // Calculate UCI move
            let promotion = '';
            if (draggedPiece.type === 'pawn' && (row === 0 || row === 7)) {
                promotion = 'q';
            }
            const uciMove = coordsToUci(fromX, fromY, row, col, promotion);

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

            // Update pieces
            const newPieces = pieces
                .filter(p => !(p.x === row && p.y === col)) // Remove captured piece
                .map(p => {
                    // Move dragged piece
                    if (p.x === fromX && p.y === fromY) {
                        const updated = { ...p, x: row, y: col, hasMoved: true };
                        if (promotion) {
                            updated.type = 'queen';
                            updated.image = PIECE_IMAGES.white.queen;
                        }
                        return updated;
                    }
                    // Move Rook if castling
                    if (castlingRookMove && p === castlingRookMove.rook) {
                        return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                    }
                    return p;
                });

            setPieces(newPieces);
            
            // Update history and turn
            const newHistory = [...moveHistoryRef.current, uciMove];
            setMoveHistory(newHistory);
            setWhoseChanceItIs(aiColor);

            // Check game state
            const gameState = chessLogic.getGameState(aiColor, newPieces);
            if (gameState === 'checkmate') {
                setMessage("Checkmate! You win!");
                setGameOver(true);
            } else if (gameState === 'stalemate') {
                setMessage("Stalemate! It's a draw.");
                setGameOver(true);
            } else {
                setMessage('');
                // Trigger AI
                triggerAiMove(newHistory);
            }
        }
        
        setDraggedPiece(null);
    };

    // New game
    const handleNewGame = () => {
        setPieces(getInitialBoard());
        setWhoseChanceItIs('white');
        setMessage('');
        setGameOver(false);
        setMoveHistory([]);
        setActiveTile(null);
        resetEngine();
    };

    // Board rendering
    const board = [];
    for (let i = 0; i < 8; i++) {
        // Player is always white (at bottom). i=0 is top (row 0), i=7 is bottom (row 7).
        const row = i;
        for (let j = 0; j < 8; j++) {
            const col = j;
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
            {/* AI Info */}
            <div className="opponentinfo" style={{ backgroundColor: 'white' }}>
                <div className="card">
                    <div className="img">
                        <img src={blackPawn} alt="stockfish" />
                    </div>
                    <div className="infos">
                        <div className="name">
                            <h1>Stockfish</h1>
                            <h3>Difficulty: {difficulty}</h3>
                        </div>
                        <h2>{isThinking ? 'Thinking...' : 'Ready'}</h2>
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
                        <img src={whitePawn} alt="you" />
                    </div>
                    <div className="infos">
                        <div className="name">
                            <h1>{user?.playerName || 'Player'}</h1>
                            <h3>Playing as White</h3>
                        </div>
                        <h2>Rating: {user?.playerRating || '—'}</h2>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="sp-controls">
                <div className="messagebox" style={{ backgroundColor: 'white' }}>
                    {message || (isThinking ? "Stockfish is thinking..." : `It's ${whoseChanceItIs}'s turn`)}
                </div>

                <div className="sp-buttons">
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
                    <button className="sp-btn" onClick={handleNewGame}>New Game</button>
                    <button className="sp-btn" onClick={() => history.push('/chessgame')}>Back</button>
                </div>

                {!isReady && (
                    <div className="sp-loading">Loading Stockfish engine...</div>
                )}
            </div>
        </div>
    );
}
