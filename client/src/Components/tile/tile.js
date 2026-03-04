/**
 * Tile Component
 * Renders a single square on the chessboard with optional coordinate labels
 */

import React, { useMemo } from 'react';
import './Tile.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function Tile({ pieces, row, col, activeTile, lastMove, onDragStart, onDragOver, onDrop, showCoords, isBottom, isLeft }) {
    const piece = useMemo(() => {
        return pieces.find(p => p.x === row && p.y === col) || null;
    }, [pieces, row, col]);

    const isHighlighted = useMemo(() => {
        if (!activeTile) return false;
        return activeTile.some(p => p.x === row && p.y === col);
    }, [activeTile, row, col]);

    const isLastMoveFrom = lastMove && lastMove.fromX === row && lastMove.fromY === col;
    const isLastMoveTo = lastMove && lastMove.toX === row && lastMove.toY === col;

    const isDark = (row + col) % 2 === 0;

    let tileClass = `tile ${isDark ? 'black-tile' : 'white-tile'}`;
    if (isHighlighted) tileClass += ' highlighted';
    if (isLastMoveFrom) tileClass += ' last-move-from';
    if (isLastMoveTo) tileClass += ' last-move-to';

    const pieceClass = `chess-piece${isLastMoveTo ? ' piece-just-moved' : ''}`;

    return (
        <div
            className={tileClass}
            onDragOver={(e) => onDragOver(e, row, col)}
            onDrop={(e) => onDrop(e, row, col)}
        >
            {piece && (
                <div
                    style={{ backgroundImage: `url(${piece.image})` }}
                    className={pieceClass}
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, piece)}
                />
            )}
            {showCoords && isLeft && (
                <span className={`coord-rank ${isDark ? 'coord-light' : 'coord-dark'}`}>{8 - row}</span>
            )}
            {showCoords && isBottom && (
                <span className={`coord-file ${isDark ? 'coord-light' : 'coord-dark'}`}>{FILES[col]}</span>
            )}
        </div>
    );
}

export default React.memo(Tile);
