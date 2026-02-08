/**
 * Move Converter
 * Converts between our board coordinates and UCI notation
 *
 * Our board:   x = row (0=rank8/top, 7=rank1/bottom), y = col (0=a-file, 7=h-file)
 * UCI format:  "e2e4" where letter = file (a-h), number = rank (1-8)
 *
 * Mapping:
 *   file = 'a' + y       (y=0 → 'a', y=7 → 'h')
 *   rank = 8 - x         (x=0 → '8', x=7 → '1')
 */

/**
 * Convert board coords to UCI notation
 * { fromX: 6, fromY: 4, toX: 4, toY: 4 } → "e2e4"
 */
export function coordsToUci(fromX, fromY, toX, toY, promotion = '') {
    const fromFile = String.fromCharCode(97 + fromY);
    const fromRank = 8 - fromX;
    const toFile = String.fromCharCode(97 + toY);
    const toRank = 8 - toX;

    return `${fromFile}${fromRank}${toFile}${toRank}${promotion}`;
}

/**
 * Convert UCI notation to board coords
 * "e2e4" → { fromX: 6, fromY: 4, toX: 4, toY: 4 }
 */
export function uciToCoords(uci) {
    const fromY = uci.charCodeAt(0) - 97;
    const fromX = 8 - parseInt(uci[1]);
    const toY = uci.charCodeAt(2) - 97;
    const toX = 8 - parseInt(uci[3]);
    const promotion = uci.length > 4 ? uci[4] : null;

    return { fromX, fromY, toX, toY, promotion };
}

/**
 * Convert full move history to UCI position string
 * Used to send current game state to Stockfish
 */
export function movesToPositionString(moves) {
    if (moves.length === 0) {
        return 'position startpos';
    }
    return `position startpos moves ${moves.join(' ')}`;
}
