/**
 * Socket Event Handlers
 * Contains all the logic for handling socket events
 */

const gameService = require('../services/game.service');
const { SOCKET_EVENTS, PLAYER_COLORS, ROOM } = require('../utils/constants');
const ChessLogic = require('../utils/ChessLogic');
const gameStateStore = require('../utils/gameStateStore');

const chessLogic = new ChessLogic();

/**
 * Handle player joining a room
 */
const handleJoin = (io, socket) => async (roomId, pieces) => {
    try {
        socket.join(roomId);

        const document = await gameService.findOrCreateGame(roomId, pieces);
        if (!document) {
            socket.emit(SOCKET_EVENTS.ERROR, 'Failed to load game');
            return;
        }

        // Initialize or refresh server-side game state from DB
        gameStateStore.setState(roomId, document.data, document.chance, null);

        socket.emit(
            SOCKET_EVENTS.LOAD_CHESSBOARD,
            document.data,
            document.chance,
            document.black,
            document.white
        );

        const { size } = gameService.getRoomInfo(io, roomId);

        if (size === 1 && document.white === null) {
            socket.emit(SOCKET_EVENTS.PLAYER_COLOR, PLAYER_COLORS.WHITE);
        } else if (size === 2 && document.black === null) {
            socket.emit(SOCKET_EVENTS.PLAYER_COLOR, PLAYER_COLORS.BLACK);
        }

        if (size <= ROOM.MAX_PLAYERS) {
            socket.to(roomId).emit(SOCKET_EVENTS.OPPONENT_RECONNECTED);
        }

        if (size > ROOM.MAX_PLAYERS) {
            socket.emit(SOCKET_EVENTS.ROOM_FULL, roomId, true);
        }

        registerRoomHandlers(io, socket, roomId);
    } catch (error) {
        console.error('Socket join error:', error.message);
        socket.emit(SOCKET_EVENTS.ERROR, 'Failed to join room');
    }
};

/**
 * Register event handlers for a specific room
 */
const registerRoomHandlers = (io, socket, roomId) => {
    socket.on(SOCKET_EVENTS.SAVE_MY_COLOR, async (playerEmail, color) => {
        try {
            await gameService.savePlayerColor(roomId, playerEmail, color);
        } catch (error) {
            console.error('save-my-color error:', error.message);
        }
    });

    socket.on(SOCKET_EVENTS.SEND_PIECES, (pieces, nextTurn, enPassantTarget, uciMove) => {
        const state = gameStateStore.getState(roomId);

        if (state && uciMove) {
            const move = gameStateStore.parseUciMove(uciMove);
            if (move) {
                const { fromX, fromY, toX, toY } = move;
                const turnColor = state.turn;

                if (!chessLogic.isValidMove(fromX, fromY, toX, toY, state.pieces, turnColor, state.enPassantTarget)) {
                    console.warn(`Invalid move rejected in room ${roomId}: ${uciMove} by ${turnColor}`);
                    socket.emit(SOCKET_EVENTS.ERROR, 'Invalid move');
                    return;
                }
            }
        }

        // Move is valid (or no state to check against), update and broadcast
        gameStateStore.setState(roomId, pieces, nextTurn, enPassantTarget);
        socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_PIECES, pieces, nextTurn, enPassantTarget, uciMove);
    });

    socket.on(SOCKET_EVENTS.SAVE_CHESSBOARD, async (newData, newChance, playerEmail) => {
        try {
            await gameService.saveChessboard(roomId, newData, newChance, playerEmail);
        } catch (error) {
            console.error('save-chessboard error:', error.message);
        }
    });

    socket.on(SOCKET_EVENTS.GAME_END_CHECKMATE, async (loseColor) => {
        try {
            await gameService.handleCheckmate(roomId, loseColor);
            gameStateStore.removeState(roomId);
            socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_UPDATE_CHECKMATE, loseColor);
        } catch (error) {
            console.error('game-end-checkmate error:', error.message);
        }
    });

    socket.on(SOCKET_EVENTS.GAME_END_DRAW, (reason) => {
        gameStateStore.removeState(roomId);
        socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_UPDATE_DRAW, reason);
    });

    socket.on(SOCKET_EVENTS.GAME_END_STALEMATE, async () => {
        try {
            await gameService.handleStalemate(roomId);
            gameStateStore.removeState(roomId);
            socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_UPDATE_STALEMATE);
        } catch (error) {
            console.error('game-end-stalemate error:', error.message);
        }
    });

    socket.on(SOCKET_EVENTS.USER_LEFT, () => {
        gameStateStore.removeState(roomId);
        socket.to(roomId).emit(SOCKET_EVENTS.OPPONENT_LEFT);
    });

    socket.on(SOCKET_EVENTS.SEND_OPPONENT_INFO, (user) => {
        socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_OPPONENT_INFO, user);
    });
};

module.exports = {
    handleJoin,
};
