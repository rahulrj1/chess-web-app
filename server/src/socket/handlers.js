/**
 * Socket Event Handlers
 * Contains all the logic for handling socket events
 * Single Responsibility: Only handles socket event logic
 */

const gameService = require('../services/game.service');
const { SOCKET_EVENTS, PLAYER_COLORS, ROOM } = require('../utils/constants');

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

        socket.emit(
            SOCKET_EVENTS.LOAD_CHESSBOARD,
            document.data,
            document.chance,
            document.black,
            document.white
        );

        // Determine room size and assign color
        const { size } = gameService.getRoomInfo(io, roomId);

        if (size === 1 && document.white === null) {
            socket.emit(SOCKET_EVENTS.PLAYER_COLOR, PLAYER_COLORS.WHITE);
        } else if (size === 2 && document.black === null) {
            socket.emit(SOCKET_EVENTS.PLAYER_COLOR, PLAYER_COLORS.BLACK);
        }

        if (size > ROOM.MAX_PLAYERS) {
            socket.emit(SOCKET_EVENTS.ROOM_FULL, roomId, true);
        }

        // Register room-specific event handlers
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
    // Save player color
    socket.on(SOCKET_EVENTS.SAVE_MY_COLOR, async (playerEmail, color) => {
        try {
            await gameService.savePlayerColor(roomId, playerEmail, color);
        } catch (error) {
            console.error('save-my-color error:', error.message);
        }
    });

    // Send pieces to opponent
    socket.on(SOCKET_EVENTS.SEND_PIECES, (pieces, opponentColor) => {
        socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_PIECES, pieces, opponentColor);
    });

    // Save chessboard state
    socket.on(SOCKET_EVENTS.SAVE_CHESSBOARD, async (newData, newChance, playerEmail) => {
        try {
            await gameService.saveChessboard(roomId, newData, newChance, playerEmail);
        } catch (error) {
            console.error('save-chessboard error:', error.message);
        }
    });

    // Handle checkmate
    socket.on(SOCKET_EVENTS.GAME_END_CHECKMATE, async (loseColor) => {
        try {
            await gameService.handleCheckmate(roomId, loseColor);
            socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_UPDATE_CHECKMATE, loseColor);
        } catch (error) {
            console.error('game-end-checkmate error:', error.message);
        }
    });

    // Handle stalemate
    socket.on(SOCKET_EVENTS.GAME_END_STALEMATE, async () => {
        try {
            await gameService.handleStalemate(roomId);
            socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_UPDATE_STALEMATE);
        } catch (error) {
            console.error('game-end-stalemate error:', error.message);
        }
    });

    // User left
    socket.on(SOCKET_EVENTS.USER_LEFT, () => {
        socket.to(roomId).emit(SOCKET_EVENTS.OPPONENT_LEFT);
    });

    // Send opponent info
    socket.on(SOCKET_EVENTS.SEND_OPPONENT_INFO, (user) => {
        socket.to(roomId).emit(SOCKET_EVENTS.RECEIVE_OPPONENT_INFO, user);
    });
};

module.exports = {
    handleJoin,
};
