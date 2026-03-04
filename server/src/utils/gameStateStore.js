/**
 * In-memory game state tracker for server-side validation.
 * Stores the current board, turn, and en passant target per room.
 */

const gameStates = new Map();

function getState(roomId) {
    return gameStates.get(roomId) || null;
}

function setState(roomId, pieces, turn, enPassantTarget) {
    gameStates.set(roomId, {
        pieces: pieces.map(p => ({ ...p })),
        turn,
        enPassantTarget: enPassantTarget || null,
    });
}

function removeState(roomId) {
    gameStates.delete(roomId);
}

/**
 * Parse a UCI move string into board coordinates.
 * "e2e4" → { fromX: 6, fromY: 4, toX: 4, toY: 4, promotion: null }
 */
function parseUciMove(uci) {
    if (!uci || uci.length < 4) return null;
    const fromY = uci.charCodeAt(0) - 97;
    const fromX = 8 - parseInt(uci[1]);
    const toY = uci.charCodeAt(2) - 97;
    const toX = 8 - parseInt(uci[3]);
    const promotion = uci.length > 4 ? uci[4] : null;
    return { fromX, fromY, toX, toY, promotion };
}

module.exports = {
    getState,
    setState,
    removeState,
    parseUciMove,
};
