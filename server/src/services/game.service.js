/**
 * Game Service
 * Handles all game-related business logic
 * Single Responsibility: Only handles game operations
 */

const { Document, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { PLAYER_COLORS, RATING } = require('../utils/constants');

/**
 * Find or create a game document
 */
const findOrCreateGame = async (roomId, initialPieces) => {
    return Document.findOrCreate(roomId, initialPieces);
};

/**
 * Delete a game board
 */
const deleteBoard = async (roomId) => {
    const board = await Document.findById(roomId);
    
    if (!board) {
        throw ApiError.notFound('Board not found');
    }
    
    await board.deleteOne();
    return { msg: 'Board deleted' };
};

/**
 * Save player color
 */
const savePlayerColor = async (roomId, playerEmail, color) => {
    const doc = await Document.findById(roomId);
    if (!doc) return null;

    if (color === PLAYER_COLORS.BLACK && doc.black === null) {
        doc.black = playerEmail;
    }
    if (color === PLAYER_COLORS.WHITE && doc.white === null) {
        doc.white = playerEmail;
    }

    await doc.save();
    return doc;
};

/**
 * Save chessboard state
 */
const saveChessboard = async (roomId, newData, newChance, playerEmail) => {
    const doc = await Document.findById(roomId);
    if (!doc) return null;

    doc.data = newData;
    doc.chance = newChance;

    // Assign player color if not set
    if (newChance === PLAYER_COLORS.WHITE && doc.black === null) {
        doc.black = playerEmail;
    }
    if (newChance === PLAYER_COLORS.BLACK && doc.white === null) {
        doc.white = playerEmail;
    }

    await doc.save();
    return doc;
};

/**
 * Handle game end by checkmate
 * Updates ratings and deletes the game
 */
const handleCheckmate = async (roomId, loserColor) => {
    const doc = await Document.findById(roomId);
    if (!doc) {
        console.error('handleCheckmate: Document not found');
        return null;
    }

    const blackUser = await User.findOne({ playerEmailId: doc.black });
    const whiteUser = await User.findOne({ playerEmailId: doc.white });

    // Only update ratings if both users are found
    if (blackUser && whiteUser) {
        if (loserColor === PLAYER_COLORS.WHITE) {
            whiteUser.playerRating -= RATING.CHANGE_ON_WIN;
            blackUser.playerRating += RATING.CHANGE_ON_WIN;
        } else {
            whiteUser.playerRating += RATING.CHANGE_ON_WIN;
            blackUser.playerRating -= RATING.CHANGE_ON_WIN;
        }

        await Promise.all([
            whiteUser.save(),
            blackUser.save(),
        ]);
    }

    await doc.deleteOne();
    return { loserColor };
};

/**
 * Handle game end by stalemate
 */
const handleStalemate = async (roomId) => {
    const doc = await Document.findById(roomId);
    if (doc) {
        await doc.deleteOne();
    }
    return { stalemate: true };
};

/**
 * Get room player count
 */
const getRoomInfo = (io, roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    return {
        size: room ? room.size : 0,
        exists: !!room,
    };
};

module.exports = {
    findOrCreateGame,
    deleteBoard,
    savePlayerColor,
    saveChessboard,
    handleCheckmate,
    handleStalemate,
    getRoomInfo,
};
