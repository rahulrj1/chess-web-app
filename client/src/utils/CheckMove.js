/**
 * Chess Logic Engine
 * Stateless utility for move validation and game state checks
 */

export default class ChessLogic {
    /**
     * Get a piece at specific coordinates
     */
    getPieceAt(x, y, pieces) {
        return pieces.find(p => p.x === x && p.y === y) || null;
    }

    /**
     * Check if a path is clear (for sliding pieces)
     */
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

    /**
     * Check if a piece can attack a specific square
     * (Used for check detection and castling safety)
     */
    canPieceAttack(piece, toX, toY, pieces) {
        const { x: fromX, y: fromY, type, color } = piece;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (type) {
            case 'pawn': {
                const direction = color === 'white' ? -1 : 1;
                // Pawn attacks diagonally only
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

    /**
     * Basic move validation (geometry + occupancy only)
     * Does NOT check for checks or special moves yet
     */
    isGeometryValid(piece, toX, toY, pieces) {
        const { x: fromX, y: fromY, type, color } = piece;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const targetPiece = this.getPieceAt(toX, toY, pieces);

        // Cannot capture own piece
        if (targetPiece && targetPiece.color === color) return false;

        switch (type) {
            case 'pawn': {
                const direction = color === 'white' ? -1 : 1; // Moving up (decrease x) for white
                const startRow = color === 'white' ? 6 : 1;

                // Move forward 1
                if (dy === 0 && dx === direction) {
                    return !targetPiece;
                }
                // Move forward 2
                if (dy === 0 && dx === direction * 2 && fromX === startRow) {
                    return !targetPiece && !this.getPieceAt(fromX + direction, fromY, pieces);
                }
                // Capture diagonal
                if (absDy === 1 && dx === direction) {
                    return !!targetPiece && targetPiece.color !== color;
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

    /**
     * Check if a move is valid (including check safety and castling)
     */
    isValidMove(fromX, fromY, toX, toY, pieces, turnColor) {
        const piece = this.getPieceAt(fromX, fromY, pieces);

        // Basic validation checks
        if (!piece) return false;
        if (piece.color !== turnColor) return false;
        if (fromX === toX && fromY === toY) return false;
        if (toX < 0 || toX > 7 || toY < 0 || toY > 7) return false;

        // Castling Logic
        if (piece.type === 'king' && Math.abs(toY - fromY) === 2 && fromX === toX) {
            return this.isCastlingValid(piece, toX, toY, pieces);
        }

        // Geometry check
        if (!this.isGeometryValid(piece, toX, toY, pieces)) return false;

        // Safety check: Does this move leave the king in check?
        return !this.isKingInCheckAfterMove(piece, toX, toY, pieces);
    }

    /**
     * Validate Castling Move
     */
    isCastlingValid(king, toX, toY, pieces) {
        if (king.hasMoved) return false;
        
        // Cannot castle if currently in check
        if (this.isKingInCheck(king.color, pieces)) return false;

        const row = king.x;
        const isKingSide = toY > king.y;
        const rookCol = isKingSide ? 7 : 0;
        const rook = this.getPieceAt(row, rookCol, pieces);

        // Check rook existence and moved status
        if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) return false;

        // Check path clear (squares between King and Rook)
        // King at 4 (e). Rook at 0 (a) or 7 (h).
        // Queenside: check 1, 2, 3 (b, c, d). Rook is at 0.
        // Kingside: check 5, 6 (f, g). Rook is at 7.
        
        const startCol = Math.min(king.y, rook.y) + 1;
        const endCol = Math.max(king.y, rook.y);
        
        for (let col = startCol; col < endCol; col++) {
            if (this.getPieceAt(row, col, pieces)) return false;
        }

        // Check if king passes through check
        const direction = isKingSide ? 1 : -1;
        // King moves 2 steps. Check square 1 and square 2 (destination).
        // Square 1: king.y + direction
        if (this.isSquareAttacked(row, king.y + direction, king.color, pieces)) return false;
        
        // Square 2: toY (destination)
        if (this.isSquareAttacked(row, toY, king.color, pieces)) return false;

        return true;
    }

    /**
     * Check if a specific square is under attack by opponent
     */
    isSquareAttacked(x, y, color, pieces) {
        const opponentColor = color === 'white' ? 'black' : 'white';
        return pieces.some(p => 
            p.color === opponentColor && this.canPieceAttack(p, x, y, pieces)
        );
    }

    /**
     * Simulate a move and check if king is under attack
     */
    isKingInCheckAfterMove(piece, toX, toY, pieces) {
        // Create hypothetical board state
        const nextPieces = pieces
            .filter(p => !(p.x === toX && p.y === toY)) // Remove captured piece
            .map(p => (p === piece ? { ...p, x: toX, y: toY } : p)); // Move piece

        return this.isKingInCheck(piece.color, nextPieces);
    }

    /**
     * Check if the king of a specific color is currently attacked
     */
    isKingInCheck(color, pieces) {
        const king = pieces.find(p => p.type === 'king' && p.color === color);
        if (!king) return false; // Should not happen in a valid game

        return this.isSquareAttacked(king.x, king.y, color, pieces);
    }

    /**
     * Check if a player has any valid moves (Checkmate/Stalemate detection)
     */
    hasAnyValidMoves(color, pieces) {
        return pieces.some(p => {
            if (p.color !== color) return false;
            // Try all squares for this piece
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    if (this.isValidMove(p.x, p.y, x, y, pieces, color)) return true;
                }
            }
            return false;
        });
    }

    /**
     * Determine game state (Checkmate, Stalemate, or Continue)
     */
    getGameState(color, pieces) {
        if (!this.hasAnyValidMoves(color, pieces)) {
            return this.isKingInCheck(color, pieces) ? 'checkmate' : 'stalemate';
        }
        return 'continue';
    }
}
