/**
 * Application Constants
 * Centralized place for magic numbers and strings
 */

const PLAYER_COLORS = {
    WHITE: 'white',
    BLACK: 'black',
};

const RATING = {
    DEFAULT: 1200,
    CHANGE_ON_WIN: 10,
};

const ROOM = {
    MAX_PLAYERS: 2,
};

const AUTH_MESSAGES = {
    VERIFIED: 'verified',
    NOT_VERIFIED: 'not-verified',
    LOGIN_SUCCESS: 'logsuc',
    LOGIN_FAILED: 'nologsuc',
};

const SOCKET_EVENTS = {
    // Client -> Server
    JOIN: 'join',
    SAVE_MY_COLOR: 'save-my-color',
    SEND_PIECES: 'send-pieces',
    SAVE_CHESSBOARD: 'save-chessboard',
    GAME_END_CHECKMATE: 'game-end-checkmate',
    GAME_END_STALEMATE: 'game-end-stalemate',
    USER_LEFT: 'user-left',
    SEND_OPPONENT_INFO: 'send-opponent-info',
    
    // Server -> Client
    LOAD_CHESSBOARD: 'load-chessboard',
    PLAYER_COLOR: 'player-color',
    ROOM_FULL: 'room-full',
    RECEIVE_PIECES: 'recieve-pieces', // Note: typo preserved for compatibility
    RECEIVE_UPDATE_CHECKMATE: 'receive-update-checkmate',
    RECEIVE_UPDATE_STALEMATE: 'receive-update-stalemate',
    OPPONENT_LEFT: 'opponent-left',
    RECEIVE_OPPONENT_INFO: 'recieve-opponent-info', // Note: typo preserved
    ERROR: 'error',
};

module.exports = {
    PLAYER_COLORS,
    RATING,
    ROOM,
    AUTH_MESSAGES,
    SOCKET_EVENTS,
};
