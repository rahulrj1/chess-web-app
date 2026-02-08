/**
 * Chess Move Validation Engine
 * Validates all piece movements and checks for check/checkmate/stalemate
 */

export default class CheckMove {
    constructor() {
        this.occupiedColor = null;
        this.occupiedType = null;
    }

    /**
     * Check if there is any valid move for a player
     */
    isThereAnyValidMove(color, pieces) {
        const direction = color === 'white' ? 1 : -1;
        let flag = false;

        pieces.forEach((p) => {
            if (p.color !== color) return;

            if (p.type === 'pawn') {
                if (
                    this.isValidMove(p.x, p.y, p.x - direction, p.y, 'pawn', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - direction, p.y + 1, 'pawn', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - direction, p.y - 1, 'pawn', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - direction * 2, p.y, 'pawn', p.color, pieces, p.color)
                ) {
                    flag = true;
                }
            } else if (p.type === 'knight') {
                if (
                    this.isValidMove(p.x, p.y, p.x + 1, p.y + 2, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 1, p.y + 2, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x + 1, p.y - 2, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 1, p.y - 2, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x + 2, p.y + 1, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 2, p.y + 1, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x + 2, p.y - 1, 'knight', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 2, p.y - 1, 'knight', p.color, pieces, p.color)
                ) {
                    flag = true;
                }
            } else if (p.type === 'king') {
                if (
                    this.isValidMove(p.x, p.y, p.x + 1, p.y + 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 1, p.y + 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x + 1, p.y - 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 1, p.y - 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x, p.y + 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x, p.y - 1, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x + 1, p.y, 'king', p.color, pieces, p.color) ||
                    this.isValidMove(p.x, p.y, p.x - 1, p.y, 'king', p.color, pieces, p.color)
                ) {
                    flag = true;
                }
            } else if (p.type === 'rook') {
                for (let i = 0; i <= 7; i++) {
                    if (this.isValidMove(p.x, p.y, i, p.y, 'rook', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x, i, 'rook', p.color, pieces, p.color)) flag = true;
                }
            } else if (p.type === 'bishop') {
                for (let i = 0; i <= 7; i++) {
                    if (this.isValidMove(p.x, p.y, p.x - i, p.y + i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x + i, p.y + i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x - i, p.y - i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x + i, p.y - i, 'bishop', p.color, pieces, p.color)) flag = true;
                }
            } else if (p.type === 'queen') {
                for (let i = 0; i <= 7; i++) {
                    // Rook moves
                    if (this.isValidMove(p.x, p.y, i, p.y, 'rook', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x, i, 'rook', p.color, pieces, p.color)) flag = true;
                    // Bishop moves
                    if (this.isValidMove(p.x, p.y, p.x - i, p.y + i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x + i, p.y + i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x - i, p.y - i, 'bishop', p.color, pieces, p.color)) flag = true;
                    if (this.isValidMove(p.x, p.y, p.x + i, p.y - i, 'bishop', p.color, pieces, p.color)) flag = true;
                }
            }
        });

        return flag;
    }

    /**
     * Check if a tile is occupied
     */
    isOccupied(x, y, pieces) {
        const occupiedPiece = pieces.find(p => p.x === x && p.y === y);
        if (occupiedPiece) {
            this.occupiedColor = occupiedPiece.color;
            this.occupiedType = occupiedPiece.type;
            return true;
        }
        return false;
    }

    /**
     * Check if king is NOT in check after a move
     */
    isKingNotOnCheck(px, py, x, y, opponentColor, pieces) {
        let newPieces = pieces.map(p => {
            if (p.x === px && p.y === py) {
                return { image: p.image, x, y, type: p.type, color: p.color };
            }
            return p;
        });
        newPieces = newPieces.filter(p => !(p.x === x && p.y === y && p.color === opponentColor));

        let kx, ky;
        const teamColor = opponentColor === 'black' ? 'white' : 'black';
        newPieces.forEach((p) => {
            if (p.color === teamColor && p.type === 'king') {
                kx = p.x;
                ky = p.y;
            }
        });

        return !this.isSquareAttacked(kx, ky, opponentColor, newPieces);
    }

    /**
     * Check if a square is attacked by opponent pieces
     */
    isSquareAttacked(x, y, opponentColor, newPieces) {
        // Knight attacks
        const knightX = [x + 1, x + 1, x - 1, x - 1, x + 2, x + 2, x - 2, x - 2];
        const knightY = [y + 2, y - 2, y + 2, y - 2, y + 1, y - 1, y + 1, y - 1];
        for (let i = 0; i < 8; i++) {
            if (this.isOccupied(knightX[i], knightY[i], newPieces)) {
                if (this.occupiedColor === opponentColor && this.occupiedType === 'knight') return true;
            }
        }

        // Pawn attacks
        const pawnX = opponentColor === 'black' ? [x - 1, x - 1] : [x + 1, x + 1];
        const pawnY = [y + 1, y - 1];
        for (let i = 0; i < 2; i++) {
            if (this.isOccupied(pawnX[i], pawnY[i], newPieces)) {
                if (this.occupiedColor === opponentColor && this.occupiedType === 'pawn') return true;
            }
        }

        // King attacks
        const kingX = [x + 1, x + 1, x - 1, x - 1, x, x, x + 1, x - 1];
        const kingY = [y + 1, y - 1, y + 1, y - 1, y + 1, y - 1, y, y];
        for (let i = 0; i < 8; i++) {
            if (this.isOccupied(kingX[i], kingY[i], newPieces)) {
                if (this.occupiedColor === opponentColor && this.occupiedType === 'king') return true;
            }
        }

        // Rook/Queen attacks (straight lines)
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of directions) {
            let i = x + dx, j = y + dy;
            while (i >= 0 && i < 8 && j >= 0 && j < 8) {
                if (this.isOccupied(i, j, newPieces)) {
                    if (this.occupiedColor === opponentColor && (this.occupiedType === 'rook' || this.occupiedType === 'queen')) return true;
                    break;
                }
                i += dx;
                j += dy;
            }
        }

        // Bishop/Queen attacks (diagonals)
        const diagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dx, dy] of diagonals) {
            let i = x + dx, j = y + dy;
            while (i >= 0 && i < 8 && j >= 0 && j < 8) {
                if (this.isOccupied(i, j, newPieces)) {
                    if (this.occupiedColor === opponentColor && (this.occupiedType === 'bishop' || this.occupiedType === 'queen')) return true;
                    break;
                }
                i += dx;
                j += dy;
            }
        }

        return false;
    }

    /**
     * Validate a move
     */
    isValidMove(px, py, x, y, type, color, pieces, whoseChanceItIs) {
        if ((px === x && py === y) || whoseChanceItIs !== color || x < 0 || y < 0 || x > 7 || y > 7) {
            return false;
        }

        const opponentColor = whoseChanceItIs === 'white' ? 'black' : 'white';
        const direction = color === 'white' ? 1 : -1;
        const startPos = color === 'white' ? 6 : 1;

        if (type === 'pawn') {
            if (px === startPos && py === y) {
                if (px - x === direction) {
                    if (this.isOccupied(x, y, pieces)) return false;
                    return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                } else if (px - x === direction * 2) {
                    if (this.isOccupied(startPos - direction, py, pieces) || this.isOccupied(x, y, pieces)) return false;
                    return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                }
            } else if (py === y) {
                if (px - x === direction) {
                    if (this.isOccupied(x, y, pieces)) return false;
                    return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                }
            } else if (Math.abs(py - y) === 1 && direction === px - x) {
                if (this.isOccupied(x, y, pieces)) {
                    return (this.occupiedColor !== color) && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                }
            }
            return false;
        } else if (type === 'rook') {
            if ((px === x && py !== y) || (py === y && px !== x)) {
                if (py !== y) {
                    const dir = py < y ? 1 : -1;
                    for (let i = py + dir; dir === 1 ? i <= y : i >= y; i += dir) {
                        if (this.isOccupied(x, i, pieces)) {
                            return this.occupiedColor !== color && i === y && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                        }
                        if (i === y) return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                    }
                    return false;
                } else {
                    const dir = px < x ? 1 : -1;
                    for (let i = px + dir; dir === 1 ? i <= x : i >= x; i += dir) {
                        if (this.isOccupied(i, y, pieces)) {
                            return this.occupiedColor !== color && i === x && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                        }
                        if (i === x) return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                    }
                    return false;
                }
            }
            return false;
        } else if (type === 'bishop') {
            if ((px - x === py - y) || (px - x === y - py)) {
                if (px - x === py - y) {
                    const dir = py < y ? 1 : -1;
                    for (let i = px + dir, j = py + dir; dir === 1 ? j <= y : j >= y; i += dir, j += dir) {
                        if (this.isOccupied(i, j, pieces)) {
                            return this.occupiedColor !== color && i === x && j === y && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                        }
                        if (i === x && j === y) return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                    }
                } else {
                    const dir = py < y ? 1 : -1;
                    for (let i = px + -1 * dir, j = py + dir; dir === 1 ? j <= y : j >= y; i += -1 * dir, j += dir) {
                        if (this.isOccupied(i, j, pieces)) {
                            return this.occupiedColor !== color && i === x && j === y && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                        }
                        if (i === x && j === y) return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                    }
                }
                return false;
            }
            return false;
        } else if (type === 'knight') {
            if ((Math.abs(px - x) === 1 && Math.abs(py - y) === 2) || (Math.abs(px - x) === 2 && Math.abs(py - y) === 1)) {
                if (this.isOccupied(x, y, pieces)) {
                    return this.occupiedColor !== color && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                }
                return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
            }
            return false;
        } else {
            // King
            if (Math.abs(px - x) <= 1 && Math.abs(py - y) <= 1) {
                if (this.isOccupied(x, y, pieces)) {
                    return this.occupiedColor !== color && this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
                }
                return this.isKingNotOnCheck(px, py, x, y, opponentColor, pieces);
            }
            return false;
        }
    }
}
