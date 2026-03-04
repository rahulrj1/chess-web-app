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
    const [enPassantTarget, setEnPassantTarget] = useState(null);
    const [pendingPromotion, setPendingPromotion] = useState(null);

    // Draw detection state
    const [halfMoveClock, setHalfMoveClock] = useState(0);
    const [positionHistory, setPositionHistory] = useState([]);

    const [difficulty, setDifficulty] = useState('medium');
    const { isReady, isThinking, requestMove, resetEngine } = useStockfish(difficulty);

    const playerColor = 'white';
    const aiColor = 'black';

    const chessLogic = useRef(new ChessLogic()).current;
    const piecesRef = useRef(pieces);
    useEffect(() => { piecesRef.current = pieces; }, [pieces]);
    const moveHistoryRef = useRef(moveHistory);
    useEffect(() => { moveHistoryRef.current = moveHistory; }, [moveHistory]);
    const enPassantRef = useRef(enPassantTarget);
    useEffect(() => { enPassantRef.current = enPassantTarget; }, [enPassantTarget]);
    const halfMoveClockRef = useRef(halfMoveClock);
    useEffect(() => { halfMoveClockRef.current = halfMoveClock; }, [halfMoveClock]);
    const positionHistoryRef = useRef(positionHistory);
    useEffect(() => { positionHistoryRef.current = positionHistory; }, [positionHistory]);

    const checkGameResult = useCallback((nextTurnColor, newPieces, newEp, newHmc, newPosHist) => {
        const drawState = { halfMoveClock: newHmc, positionHistory: newPosHist };
        return chessLogic.getGameState(nextTurnColor, newPieces, newEp, drawState);
    }, [chessLogic]);

    const applyGameResult = useCallback((gameState, nextTurnColor) => {
        switch (gameState) {
            case 'checkmate':
                setMessage(nextTurnColor === playerColor
                    ? "Checkmate! Stockfish wins."
                    : "Checkmate! You win!");
                setGameOver(true);
                return true;
            case 'stalemate':
                setMessage("Stalemate! It's a draw.");
                setGameOver(true);
                return true;
            case 'draw-insufficient':
                setMessage("Draw — insufficient material.");
                setGameOver(true);
                return true;
            case 'draw-fifty':
                setMessage("Draw — fifty-move rule.");
                setGameOver(true);
                return true;
            case 'draw-repetition':
                setMessage("Draw — threefold repetition.");
                setGameOver(true);
                return true;
            default:
                return false;
        }
    }, [playerColor]);

    const executeAiMove = useCallback((uciMove) => {
        const { fromX, fromY, toX, toY, promotion } = uciToCoords(uciMove);
        const currentPieces = piecesRef.current;
        const movingPiece = currentPieces.find(p => p.x === fromX && p.y === fromY);
        if (!movingPiece) return;

        const currentEp = enPassantRef.current;
        const isCapture = !!currentPieces.find(p => p.x === toX && p.y === toY);

        const isEnPassant = movingPiece.type === 'pawn' && currentEp &&
            toX === currentEp.x && toY === currentEp.y;

        const isCastling = movingPiece.type === 'king' && Math.abs(toY - fromY) === 2;
        let castlingRookMove = null;
        if (isCastling) {
            const isKingSide = toY > fromY;
            const rookCol = isKingSide ? 7 : 0;
            const rookDestCol = isKingSide ? 5 : 3;
            const rook = currentPieces.find(p => p.x === fromX && p.y === rookCol && p.type === 'rook');
            if (rook) castlingRookMove = { rook, toCol: rookDestCol };
        }

        let newPieces = currentPieces
            .filter(p => !(p.x === toX && p.y === toY))
            .map(p => {
                if (p.x === fromX && p.y === fromY) {
                    const updated = { ...p, x: toX, y: toY, hasMoved: true };
                    if (promotion || (p.type === 'pawn' && (toX === 0 || toX === 7))) {
                        const promoType = promotion || 'q';
                        const typeMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
                        updated.type = typeMap[promoType] || 'queen';
                        updated.image = PIECE_IMAGES[p.color][updated.type];
                    }
                    return updated;
                }
                if (castlingRookMove && p === castlingRookMove.rook) {
                    return { ...p, y: castlingRookMove.toCol, hasMoved: true };
                }
                return p;
            });

        if (isEnPassant) {
            const capturedRow = movingPiece.color === 'white' ? toX + 1 : toX - 1;
            newPieces = newPieces.filter(p => !(p.x === capturedRow && p.y === toY));
        }

        let newEp = null;
        if (movingPiece.type === 'pawn' && Math.abs(toX - fromX) === 2) {
            newEp = { x: (fromX + toX) / 2, y: fromY };
        }
        setEnPassantTarget(newEp);

        const resetClock = movingPiece.type === 'pawn' || isCapture || isEnPassant;
        const newHmc = resetClock ? 0 : halfMoveClockRef.current + 1;
        setHalfMoveClock(newHmc);

        const posKey = chessLogic.generatePositionKey(newPieces, playerColor, newEp);
        const newPosHist = [...positionHistoryRef.current, posKey];
        setPositionHistory(newPosHist);

        setPieces(newPieces);
        const gameState = checkGameResult(playerColor, newPieces, newEp, newHmc, newPosHist);
        if (!applyGameResult(gameState, playerColor)) {
            if (chessLogic.isKingInCheck(playerColor, newPieces)) {
                setMessage("Check!");
            } else {
                setMessage('');
            }
        }
        setMoveHistory(prev => [...prev, uciMove]);
        setWhoseChanceItIs(playerColor);
    }, [chessLogic, playerColor, checkGameResult, applyGameResult]);

    const triggerAiMove = useCallback((newMoveHistory) => {
        if (!isReady || gameOver) return;
        const position = movesToPositionString(newMoveHistory);
        requestMove(position, (uciMove) => {
            setTimeout(() => executeAiMove(uciMove), 300);
        });
    }, [isReady, gameOver, requestMove, executeAiMove]);

    const handleDragStart = (e, piece) => {
        if (piece.color !== playerColor || whoseChanceItIs !== playerColor || gameOver || isThinking || pendingPromotion) {
            e.preventDefault();
            return;
        }
        setDraggedPiece(piece);
        const moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (chessLogic.isValidMove(piece.x, piece.y, r, c, pieces, playerColor, enPassantTarget)) {
                    moves.push({ x: r, y: c });
                }
            }
        }
        setActiveTile(moves);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const executePlayerMove = (fromX, fromY, row, col, promotionType) => {
        const movingPiece = pieces.find(p => p.x === fromX && p.y === fromY);
        if (!movingPiece) return;

        let promotion = promotionType || '';
        const uciMove = coordsToUci(fromX, fromY, row, col, promotion);
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
                    if (promotion) {
                        const typeMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
                        updated.type = typeMap[promotion] || 'queen';
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

        const posKey = chessLogic.generatePositionKey(newPieces, aiColor, newEp);
        const newPosHist = [...positionHistory, posKey];
        setPositionHistory(newPosHist);

        setPieces(newPieces);
        const newHistory = [...moveHistoryRef.current, uciMove];
        setMoveHistory(newHistory);
        setWhoseChanceItIs(aiColor);

        const gameState = checkGameResult(aiColor, newPieces, newEp, newHmc, newPosHist);
        if (!applyGameResult(gameState, aiColor)) {
            setMessage('');
            triggerAiMove(newHistory);
        }
    };

    const handleDrop = (e, row, col) => {
        e.preventDefault();
        setActiveTile(null);
        if (!draggedPiece) return;
        const { x: fromX, y: fromY } = draggedPiece;

        if (chessLogic.isValidMove(fromX, fromY, row, col, pieces, playerColor, enPassantTarget)) {
            if (draggedPiece.type === 'pawn' && (row === 0 || row === 7)) {
                setPendingPromotion({ fromX, fromY, row, col });
                setDraggedPiece(null);
                return;
            }
            executePlayerMove(fromX, fromY, row, col, '');
        }
        setDraggedPiece(null);
    };

    const handlePromotionChoice = (type) => {
        if (!pendingPromotion) return;
        const { fromX, fromY, row, col } = pendingPromotion;
        executePlayerMove(fromX, fromY, row, col, type);
        setPendingPromotion(null);
    };

    const handleNewGame = () => {
        setPieces(getInitialBoard());
        setWhoseChanceItIs('white');
        setMessage('');
        setGameOver(false);
        setMoveHistory([]);
        setActiveTile(null);
        setEnPassantTarget(null);
        setPendingPromotion(null);
        setHalfMoveClock(0);
        setPositionHistory([]);
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
                    showCoords={true}
                    isBottom={row === 7}
                    isLeft={j === 0}
                />
            );
        }
    }

    const whitePawn = PIECE_IMAGES.white.pawn;
    const blackPawn = PIECE_IMAGES.black.pawn;

    return (
        <div className="sp-page">
            <div className="sp-layout">
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

                    {moveHistory.length > 0 && (
                        <div className="sp-history">
                            <span className="sp-label">Moves</span>
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

                    <div className="sp-actions">
                        <button className="sp-btn primary" onClick={handleNewGame}>New Game</button>
                        <button className="sp-btn" onClick={() => history.push('/chessgame')}>Back</button>
                    </div>

                    {!isReady && <div className="sp-loading">Loading engine...</div>}
                </div>
            </div>

            {pendingPromotion && (
                <div className="promotion-overlay">
                    <div className="promotion-modal">
                        <p>Promote pawn to:</p>
                        <div className="promotion-options">
                            {['queen', 'rook', 'bishop', 'knight'].map(type => (
                                <button key={type} className="promotion-piece" onClick={() => handlePromotionChoice(type[0])}>
                                    <img src={PIECE_IMAGES[playerColor][type]} alt={type} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
