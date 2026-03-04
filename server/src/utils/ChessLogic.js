/**
 * Chess Logic Engine (Server-side)
 * Stateless utility for move validation
 * Mirrors client/src/utils/CheckMove.js
 */

class ChessLogic {
    getPieceAt(x, y, pieces) {
        return pieces.find(p => p.x === x && p.y === y) || null;
    }

    isPathClear(fromX, fromY, toX, toY, pieces) {
        const dx = Math.sign(toX - fromX);
        const dy = Math.sign(toY - fromY);
        let x = fromX + dx;
        let y = fromY + dy;

        while (x !== toX || y !== toY) {
            if (this.getPieceAt(x, y, pieces)) return false;
            x += dx;
            y += dy;
        }
        return true;
    }

    canPieceAttack(piece, toX, toY, pieces) {
        const { x: fromX, y: fromY, type, color } = piece;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (type) {
            case 'pawn': {
                const direction = color === 'white' ? -1 : 1;
                return absDy === 1 && dx === direction;
            }
            case 'rook':
                return (dx === 0 || dy === 0) && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'bishop':
                return absDx === absDy && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'queen':
                return (dx === 0 || dy === 0 || absDx === absDy) && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'knight':
                return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
            case 'king':
                return absDx <= 1 && absDy <= 1;
            default:
                return false;
        }
    }

    isGeometryValid(piece, toX, toY, pieces, enPassantTarget) {
        const { x: fromX, y: fromY, type, color } = piece;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const targetPiece = this.getPieceAt(toX, toY, pieces);

        if (targetPiece && targetPiece.color === color) return false;

        switch (type) {
            case 'pawn': {
                const direction = color === 'white' ? -1 : 1;
                const startRow = color === 'white' ? 6 : 1;

                if (dy === 0 && dx === direction) return !targetPiece;
                if (dy === 0 && dx === direction * 2 && fromX === startRow) {
                    return !targetPiece && !this.getPieceAt(fromX + direction, fromY, pieces);
                }
                if (absDy === 1 && dx === direction) {
                    if (targetPiece && targetPiece.color !== color) return true;
                    if (enPassantTarget && toX === enPassantTarget.x && toY === enPassantTarget.y) return true;
                    return false;
                }
                return false;
            }
            case 'rook':
                return (dx === 0 || dy === 0) && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'bishop':
                return absDx === absDy && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'queen':
                return (dx === 0 || dy === 0 || absDx === absDy) && this.isPathClear(fromX, fromY, toX, toY, pieces);
            case 'knight':
                return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
            case 'king':
                return absDx <= 1 && absDy <= 1;
            default:
                return false;
        }
    }

    isValidMove(fromX, fromY, toX, toY, pieces, turnColor, enPassantTarget) {
        const piece = this.getPieceAt(fromX, fromY, pieces);

        if (!piece) return false;
        if (piece.color !== turnColor) return false;
        if (fromX === toX && fromY === toY) return false;
        if (toX < 0 || toX > 7 || toY < 0 || toY > 7) return false;

        if (piece.type === 'king' && Math.abs(toY - fromY) === 2 && fromX === toX) {
            return this.isCastlingValid(piece, toX, toY, pieces);
        }

        if (!this.isGeometryValid(piece, toX, toY, pieces, enPassantTarget)) return false;
        return !this.isKingInCheckAfterMove(piece, toX, toY, pieces, enPassantTarget);
    }

    isCastlingValid(king, toX, toY, pieces) {
        if (king.hasMoved) return false;
        if (this.isKingInCheck(king.color, pieces)) return false;

        const row = king.x;
        const isKingSide = toY > king.y;
        const rookCol = isKingSide ? 7 : 0;
        const rook = this.getPieceAt(row, rookCol, pieces);

        if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) return false;

        const startCol = Math.min(king.y, rook.y) + 1;
        const endCol = Math.max(king.y, rook.y);

        for (let col = startCol; col < endCol; col++) {
            if (this.getPieceAt(row, col, pieces)) return false;
        }

        const direction = isKingSide ? 1 : -1;
        if (this.isSquareAttacked(row, king.y + direction, king.color, pieces)) return false;
        if (this.isSquareAttacked(row, toY, king.color, pieces)) return false;

        return true;
    }

    isSquareAttacked(x, y, color, pieces) {
        const opponentColor = color === 'white' ? 'black' : 'white';
        return pieces.some(p =>
            p.color === opponentColor && this.canPieceAttack(p, x, y, pieces)
        );
    }

    isKingInCheckAfterMove(piece, toX, toY, pieces, enPassantTarget) {
        let nextPieces = pieces
            .filter(p => !(p.x === toX && p.y === toY))
            .map(p => (p === piece ? { ...p, x: toX, y: toY } : p));

        if (piece.type === 'pawn' && enPassantTarget && toX === enPassantTarget.x && toY === enPassantTarget.y) {
            const capturedRow = piece.color === 'white' ? toX + 1 : toX - 1;
            nextPieces = nextPieces.filter(p => !(p.x === capturedRow && p.y === toY));
        }

        return this.isKingInCheck(piece.color, nextPieces);
    }

    isKingInCheck(color, pieces) {
        const king = pieces.find(p => p.type === 'king' && p.color === color);
        if (!king) return false;
        return this.isSquareAttacked(king.x, king.y, color, pieces);
    }
}

module.exports = ChessLogic;
