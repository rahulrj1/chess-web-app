/**
 * Frontend Constants
 */

export const HORIZONTAL_AXIS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const VERTICAL_AXIS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export const PIECE_IMAGES = {
    white: {
        rook: '/images/wr.png',
        knight: '/images/wn.png',
        bishop: '/images/wb.png',
        queen: '/images/wq.png',
        king: '/images/wk.png',
        pawn: '/images/wp.png',
    },
    black: {
        rook: '/images/br.png',
        knight: '/images/bn.png',
        bishop: '/images/bb.png',
        queen: '/images/bq.png',
        king: '/images/bk.png',
        pawn: '/images/bp.png',
    },
};

/**
 * Initial board setup
 */
export const INITIAL_BOARD = [
    // Black pieces
    { image: PIECE_IMAGES.black.rook, x: 0, y: 0, type: 'rook', color: 'black' },
    { image: PIECE_IMAGES.black.rook, x: 0, y: 7, type: 'rook', color: 'black' },
    { image: PIECE_IMAGES.black.knight, x: 0, y: 1, type: 'knight', color: 'black' },
    { image: PIECE_IMAGES.black.knight, x: 0, y: 6, type: 'knight', color: 'black' },
    { image: PIECE_IMAGES.black.bishop, x: 0, y: 2, type: 'bishop', color: 'black' },
    { image: PIECE_IMAGES.black.bishop, x: 0, y: 5, type: 'bishop', color: 'black' },
    { image: PIECE_IMAGES.black.queen, x: 0, y: 3, type: 'queen', color: 'black' },
    { image: PIECE_IMAGES.black.king, x: 0, y: 4, type: 'king', color: 'black' },
    // White pieces
    { image: PIECE_IMAGES.white.rook, x: 7, y: 0, type: 'rook', color: 'white' },
    { image: PIECE_IMAGES.white.rook, x: 7, y: 7, type: 'rook', color: 'white' },
    { image: PIECE_IMAGES.white.knight, x: 7, y: 1, type: 'knight', color: 'white' },
    { image: PIECE_IMAGES.white.knight, x: 7, y: 6, type: 'knight', color: 'white' },
    { image: PIECE_IMAGES.white.bishop, x: 7, y: 2, type: 'bishop', color: 'white' },
    { image: PIECE_IMAGES.white.bishop, x: 7, y: 5, type: 'bishop', color: 'white' },
    { image: PIECE_IMAGES.white.queen, x: 7, y: 3, type: 'queen', color: 'white' },
    { image: PIECE_IMAGES.white.king, x: 7, y: 4, type: 'king', color: 'white' },
    // Pawns
    ...Array.from({ length: 8 }, (_, i) => ({
        image: PIECE_IMAGES.black.pawn, x: 1, y: i, type: 'pawn', color: 'black',
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
        image: PIECE_IMAGES.white.pawn, x: 6, y: i, type: 'pawn', color: 'white',
    })),
];

export const TILE_SIZE = 70;
