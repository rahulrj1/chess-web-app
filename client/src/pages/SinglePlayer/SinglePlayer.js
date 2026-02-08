/**
 * SinglePlayer Page
 * Play chess against Stockfish AI
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context';
import useStockfish, { DIFFICULTY_LEVELS } from '../../hooks/useStockfish';
import Tile from '../../components/Tile/Tile';
import CheckMove from '../../utils/CheckMove';
import { coordsToUci, uciToCoords, movesToPositionString } from '../../utils/moveConverter';
import { HORIZONTAL_AXIS, VERTICAL_AXIS, INITIAL_BOARD, TILE_SIZE, PIECE_IMAGES } from '../../utils/constants';
import './SinglePlayer.css';

// Deep clone the initial board so each game starts fresh
function getInitialBoard() {
    return INITIAL_BOARD.map(p => ({ ...p }));
}

export default function SinglePlayer() {
    const chessBoardRef = useRef(null);
    const history = useHistory();
    const { user } = useAuth();

    // Game state
    const [pieces, setPieces] = useState(getInitialBoard);
    const [initialX, setInitialX] = useState(null);
    const [initialY, setInitialY] = useState(null);
    const [activePiece, setActivePiece] = useState(null);
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

    const checkMove = useRef(new CheckMove()).current;

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
        const attackedPiece = currentPieces.find(p => p.x === toX && p.y === toY);

        if (!movingPiece) return;

        setPieces(prev => {
            let filtered = attackedPiece ? prev.filter(p => p !== attackedPiece) : [...prev];
            let newPieces = filtered.map(p => {
                if (p.x === fromX && p.y === fromY && p.color === movingPiece.color && p.type === movingPiece.type) {
                    const updated = { ...p, x: toX, y: toY };
                    // Handle promotion
                    if (promotion || (p.type === 'pawn' && (toX === 0 || toX === 7))) {
                        updated.type = 'queen';
                        updated.image = p.color === 'white' ? PIECE_IMAGES.white.queen : PIECE_IMAGES.black.queen;
                    }
                    return updated;
                }
                return p;
            });

            // Check if player has valid moves
            if (!checkMove.isThereAnyValidMove(playerColor, newPieces)) {
                if (!checkMove.isKingNotOnCheck(-1, -1, -1, -1, aiColor, newPieces)) {
                    setMessage("Checkmate! Stockfish wins.");
                } else {
                    setMessage("Stalemate! It's a draw.");
                }
                setGameOver(true);
            }

            return newPieces;
        });

        setMoveHistory(prev => [...prev, uciMove]);
        setWhoseChanceItIs(playerColor);
    }, [checkMove, playerColor, aiColor]);

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

    // Board rendering (player is always white, so standard orientation)
    const board = [];
    for (let row = 0; row <= 7; row++) {
        for (let col = 0; col <= 7; col++) {
            board.push(
                <span key={`${HORIZONTAL_AXIS[row]}-${VERTICAL_AXIS[col]}-${col}`}>
                    <Tile pieces={pieces} row={row} col={col} activeTile={activeTile} />
                </span>
            );
        }
    }

    // Coordinate helper
    const getCoord = useCallback((clientPos, offset) => {
        return Math.floor((clientPos - offset) / TILE_SIZE);
    }, []);

    // Grab piece
    function grabPiece(e) {
        if (whoseChanceItIs !== playerColor || gameOver || isThinking) return;

        const chessboard = chessBoardRef.current;
        const element = e.target;

        if (element.classList.contains('chess-piece')) {
            const pieceY = getCoord(e.clientX, chessboard.offsetLeft);
            const pieceX = getCoord(e.clientY, chessboard.offsetTop);
            setInitialY(pieceY);
            setInitialX(pieceX);

            element.style.position = 'absolute';
            element.style.left = `${e.clientX - 35}px`;
            element.style.top = `${e.clientY - 35}px`;
            setActivePiece(element);
        }

        // Valid move highlighting
        const activePieceX = getCoord(e.clientX, chessboard.offsetLeft);
        const activePieceY = getCoord(e.clientY, chessboard.offsetTop);

        let aColor = '';
        let aType = '';
        pieces.forEach(p => {
            if (p.x === activePieceY && p.y === activePieceX) {
                aColor = p.color;
                aType = p.type;
            }
        });

        if (aColor !== playerColor) {
            setActiveTile(null);
            return;
        }

        const validMoves = [];
        for (let row = 0; row <= 7; row++) {
            for (let col = 0; col <= 7; col++) {
                let validMove;
                if (aType === 'queen') {
                    validMove = checkMove.isValidMove(activePieceY, activePieceX, row, col, 'bishop', aColor, pieces, whoseChanceItIs) ||
                        checkMove.isValidMove(activePieceY, activePieceX, row, col, 'rook', aColor, pieces, whoseChanceItIs);
                } else {
                    validMove = checkMove.isValidMove(activePieceY, activePieceX, row, col, aType, aColor, pieces, whoseChanceItIs);
                }
                if (validMove) {
                    validMoves.push({ x: row, y: col });
                }
            }
        }
        setActiveTile(validMoves);
    }

    // Move piece
    function movePiece(e) {
        if (activePiece) {
            activePiece.style.position = 'absolute';
            activePiece.style.top = `${e.clientY - 35}px`;
            activePiece.style.left = `${e.clientX - 35}px`;
        }
    }

    // Drop piece
    function dropPiece(e) {
        const chessboard = chessBoardRef.current;
        const col_num = getCoord(e.clientX, chessboard.offsetLeft);
        const row_num = getCoord(e.clientY, chessboard.offsetTop);
        const minX = chessboard.offsetLeft;
        const minY = chessboard.offsetTop;
        const maxX = chessboard.offsetLeft + chessboard.clientWidth;
        const maxY = chessboard.offsetTop + chessboard.clientHeight;

        setActiveTile(null);

        if (activePiece) {
            if (e.clientX > maxX || e.clientX < minX || e.clientY > maxY || e.clientY < minY) {
                activePiece.style.position = 'relative';
                activePiece.style.removeProperty('top');
                activePiece.style.removeProperty('left');
                setActivePiece(null);
            } else {
                const currentPiece = pieces.find(p => p.x === initialX && p.y === initialY);
                const attackedPiece = pieces.find(p => p.x === row_num && p.y === col_num);

                if (currentPiece && currentPiece.color === playerColor) {
                    let validMove;
                    if (currentPiece.type === 'queen') {
                        validMove = checkMove.isValidMove(initialX, initialY, row_num, col_num, 'rook', currentPiece.color, pieces, whoseChanceItIs) ||
                            checkMove.isValidMove(initialX, initialY, row_num, col_num, 'bishop', currentPiece.color, pieces, whoseChanceItIs);
                    } else {
                        validMove = checkMove.isValidMove(initialX, initialY, row_num, col_num, currentPiece.type, currentPiece.color, pieces, whoseChanceItIs);
                    }

                    if (validMove) {
                        // Build UCI move
                        let promotion = '';
                        if (currentPiece.type === 'pawn' && (row_num === 0 || row_num === 7)) {
                            promotion = 'q'; // Auto-promote to queen
                        }
                        const uciMove = coordsToUci(initialX, initialY, row_num, col_num, promotion);

                        setPieces(prev => {
                            let filtered = prev.filter(p => p !== attackedPiece);
                            let newPieces = filtered.map(p => {
                                if (p === currentPiece) {
                                    const updated = { ...p, x: row_num, y: col_num };
                                    if (promotion) {
                                        updated.type = 'queen';
                                        updated.image = PIECE_IMAGES.white.queen;
                                    }
                                    return updated;
                                }
                                return p;
                            });

                            // Check for checkmate/stalemate
                            if (!checkMove.isThereAnyValidMove(aiColor, newPieces)) {
                                if (!checkMove.isKingNotOnCheck(-1, -1, -1, -1, playerColor, newPieces)) {
                                    setMessage("Checkmate! You win!");
                                } else {
                                    setMessage("Stalemate! It's a draw.");
                                }
                                setGameOver(true);
                            }

                            return newPieces;
                        });

                        const newHistory = [...moveHistoryRef.current, uciMove];
                        setMoveHistory(newHistory);
                        setWhoseChanceItIs(aiColor);

                        // Trigger AI response
                        if (!gameOver) {
                            triggerAiMove(newHistory);
                        }
                    } else {
                        activePiece.style.position = 'relative';
                        activePiece.style.removeProperty('top');
                        activePiece.style.removeProperty('left');
                    }
                }
            }
            setActivePiece(null);
            setInitialX(null);
            setInitialY(null);
        }
    }

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

    const whitePawn = PIECE_IMAGES.white.pawn;
    const blackPawn = PIECE_IMAGES.black.pawn;

    return (
        <>
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
                <div
                    className="chessboard"
                    ref={chessBoardRef}
                    onMouseDown={grabPiece}
                    onMouseMove={movePiece}
                    onMouseUp={dropPiece}
                >
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
                        {isThinking ? "Stockfish is thinking..." : `It's ${whoseChanceItIs}'s turn`}
                        {message && <><br /><strong>{message}</strong></>}
                    </div>

                    <div className="sp-buttons">
                        {/* Difficulty selector */}
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
        </>
    );
}
