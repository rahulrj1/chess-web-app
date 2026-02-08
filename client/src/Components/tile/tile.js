/**
 * Tile Component
 * Renders a single square on the chessboard
 */

import React, { useMemo } from 'react';
import './Tile.css';

function Tile({ pieces, row, col, activeTile, onDragStart, onDragOver, onDrop }) {
    const piece = useMemo(() => {
        return pieces.find(p => p.x === row && p.y === col) || null;
    }, [pieces, row, col]);

    const isHighlighted = useMemo(() => {
        if (!activeTile) return false;
        return activeTile.some(p => p.x === row && p.y === col);
    }, [activeTile, row, col]);

    const isDark = (row + col) % 2 === 0;
    const tileClass = `tile ${isDark ? 'black-tile' : 'white-tile'}${isHighlighted ? ' highlighted' : ''}`;

    return (
        <div 
            className={tileClass}
            onDragOver={(e) => onDragOver(e, row, col)}
            onDrop={(e) => onDrop(e, row, col)}
        >
            {piece && (
                <div
                    style={{ backgroundImage: `url(${piece.image})` }}
                    className="chess-piece"
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, piece)}
                />
            )}
        </div>
    );
}

export default React.memo(Tile);
