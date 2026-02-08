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
import CheckMove from '../../utils/CheckMove';
import { HORIZONTAL_AXIS, VERTICAL_AXIS, INITIAL_BOARD, TILE_SIZE, PIECE_IMAGES } from '../../utils/constants';
import './Game.css';

export default function Game() {
    const chessBoardRef = useRef(null);
    const { roomId } = useParams();
    const history = useHistory();
    const { user } = useAuth();

    const [pieces, setPieces] = useState(INITIAL_BOARD);
    const [initialX, setInitialX] = useState(null);
    const [initialY, setInitialY] = useState(null);
    const [activePiece, setActivePiece] = useState(null);
    const [activeTile, setActiveTile] = useState(null);
    const [whoseChanceItIs, setWhoseChanceItIs] = useState(null);
    const [yourColor, setYourColor] = useState(null);
    const [message, setMessage] = useState('');

    const [opponentUser, setOpponentUser] = useState({
        playerName: '',
        playerId: '',
        playerEmailId: '',
        playerRating: '',
    });

    const [bMail, setBMail] = useState('');
    const [wMail, setWMail] = useState('');

    const { socket, emit } = useSocket(roomId, pieces);
    const checkMove = useRef(new CheckMove()).current;

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
        const handler = () => history.goBack();
        socket.on('room-full', handler);
        return () => socket.off('room-full', handler);
    }, [socket, history]);

    // Checkmate handler
    useEffect(() => {
        if (!socket) return;
        const handler = (loseColor) => {
            const winColor = loseColor === 'black' ? 'white' : 'black';
            setMessage(`It's checkmate !! Player with ${winColor} Wins Game`);
        };
        socket.on('receive-update-checkmate', handler);
        return () => socket.off('receive-update-checkmate', handler);
    }, [socket]);

    // Stalemate handler
    useEffect(() => {
        if (!socket) return;
        const handler = () => setMessage("It's a stalemate");
        socket.on('receive-update-stalemate', handler);
        return () => socket.off('receive-update-stalemate', handler);
    }, [socket]);

    // Opponent left handler
    useEffect(() => {
        if (!socket) return;
        const handler = () => setMessage('Your opponent left');
        socket.on('opponent-left', handler);
        return () => socket.off('opponent-left', handler);
    }, [socket]);

    // Receive pieces from opponent
    useEffect(() => {
        if (!socket) return;
        const handler = (receivedPieces, opponentColor) => {
            setWhoseChanceItIs(opponentColor);
            setPieces(receivedPieces);
        };
        socket.on('recieve-pieces', handler);
        return () => socket.off('recieve-pieces', handler);
    }, [socket]);

    // Load chessboard from server
    useEffect(() => {
        if (!socket) return;
        const handler = (data, chance, blackEmail, whiteEmail) => {
            setPieces(data);
            setWhoseChanceItIs(chance);
            setBMail(blackEmail);
            setWMail(whiteEmail);
        };
        socket.on('load-chessboard', handler);
        return () => socket.off('load-chessboard', handler);
    }, [socket]);

    // Determine color from saved emails
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

    // Board rendering
    const isBlack = yourColor === 'black';
    const board = [];

    const startRow = isBlack ? 7 : 0;
    const endRow = isBlack ? -1 : 8;
    const stepRow = isBlack ? -1 : 1;
    const startCol = isBlack ? 7 : 0;
    const endCol = isBlack ? -1 : 8;
    const stepCol = isBlack ? -1 : 1;

    for (let row = startRow; row !== endRow; row += stepRow) {
        for (let col = startCol; col !== endCol; col += stepCol) {
            board.push(
                <span key={`${HORIZONTAL_AXIS[row]},${VERTICAL_AXIS[7 - row]}-${col}`}>
                    <Tile pieces={pieces} row={row} col={col} activeTile={activeTile} />
                </span>
            );
        }
    }

    // Coordinate helpers
    const getCoord = useCallback((clientPos, offset) => {
        if (isBlack) {
            return Math.floor(8 - ((clientPos - offset) / TILE_SIZE));
        }
        return Math.floor((clientPos - offset) / TILE_SIZE);
    }, [isBlack]);

    // Grab a piece
    function grabPiece(e) {
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

        // Calculate valid moves for highlighting
        const validMoves = [];
        for (let row = 0; row <= 7; row++) {
            for (let col = 0; col <= 7; col++) {
                const targetRow = isBlack ? 7 - row : row;
                const targetCol = isBlack ? 7 - col : col;
                let validMove;

                if (aType === 'queen') {
                    validMove = checkMove.isValidMove(activePieceY, activePieceX, targetRow, targetCol, 'bishop', aColor, pieces, whoseChanceItIs, yourColor) ||
                        checkMove.isValidMove(activePieceY, activePieceX, targetRow, targetCol, 'rook', aColor, pieces, whoseChanceItIs, yourColor);
                } else {
                    validMove = checkMove.isValidMove(activePieceY, activePieceX, targetRow, targetCol, aType, aColor, pieces, whoseChanceItIs, yourColor);
                }

                if (validMove) {
                    validMoves.push({ x: targetRow, y: targetCol });
                }
            }
        }
        setActiveTile(validMoves);
    }

    // Move piece with mouse
    function movePiece(e) {
        if (activePiece) {
            activePiece.style.position = 'absolute';
            activePiece.style.top = `${e.clientY - 35}px`;
            activePiece.style.left = `${e.clientX - 35}px`;
        }
    }

    // Drop a piece
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
                // Outside board
                activePiece.style.position = 'relative';
                activePiece.style.removeProperty('top');
                activePiece.style.removeProperty('left');
                setActivePiece(null);
            } else {
                const currentPiece = pieces.find(p => p.x === initialX && p.y === initialY);
                const attackedPiece = pieces.find(p => p.x === row_num && p.y === col_num);

                if (currentPiece) {
                    let validMove;
                    if (currentPiece.type === 'queen') {
                        validMove = checkMove.isValidMove(initialX, initialY, row_num, col_num, 'rook', currentPiece.color, pieces, whoseChanceItIs, yourColor) ||
                            checkMove.isValidMove(initialX, initialY, row_num, col_num, 'bishop', currentPiece.color, pieces, whoseChanceItIs, yourColor);
                    } else {
                        validMove = checkMove.isValidMove(initialX, initialY, row_num, col_num, currentPiece.type, currentPiece.color, pieces, whoseChanceItIs, yourColor);
                    }

                    if (yourColor === currentPiece.color && validMove) {
                        setPieces(prevPieces => {
                            let filtered = prevPieces.filter(p => p !== attackedPiece);
                            let newPieces = filtered.map(p => {
                                if (p === currentPiece) {
                                    p.x = row_num;
                                    p.y = col_num;
                                }
                                // Pawn promotion
                                if (p.type === 'pawn') {
                                    if (p.color === 'white' && p.x === 0) {
                                        p.type = 'queen';
                                        p.image = PIECE_IMAGES.white.queen;
                                    } else if (p.color === 'black' && p.x === 7) {
                                        p.type = 'queen';
                                        p.image = PIECE_IMAGES.black.queen;
                                    }
                                }
                                return p;
                            });

                            const opponentColor = currentPiece.color === 'white' ? 'black' : 'white';
                            emit('send-pieces', newPieces, opponentColor);
                            emit('save-chessboard', newPieces, opponentColor, user?.playerEmailId);

                            if (!checkMove.isThereAnyValidMove(opponentColor, newPieces)) {
                                if (!checkMove.isKingNotOnCheck(-1, -1, -1, -1, currentPiece.color, newPieces)) {
                                    emit('game-end-checkmate', opponentColor);
                                    setMessage(`It's checkmate !! Player with ${currentPiece.color} Wins Game`);
                                } else {
                                    emit('game-end-stalemate');
                                    setMessage("It's stalemate!!");
                                }
                            }

                            return newPieces;
                        });

                        setWhoseChanceItIs(prev => prev === 'white' ? 'black' : 'white');
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

    // Exit game
    const handleExit = () => {
        gameApi.deleteBoard(roomId).catch(console.error);
        emit('user-left');
        history.push('/chessgame');
    };

    const whitePawn = PIECE_IMAGES.white.pawn;
    const blackPawn = PIECE_IMAGES.black.pawn;

    return (
        <>
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
                                <h3>@{opponentUser.playerId}</h3>
                            </div>
                            <h2>Rating: {opponentUser.playerRating}</h2>
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

                {/* Your Info */}
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
                    <button className="button" onClick={handleExit}>Exit</button>
                </div>

                {/* Message Box */}
                <div className="messagebox" style={{ backgroundColor: 'white' }}>
                    Its {whoseChanceItIs}'s Turn<br />
                    {message}
                </div>
            </div>
        </>
    );
}
