/**
 * useStockfish Hook
 * Manages Stockfish Web Worker lifecycle and UCI communication
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DIFFICULTY_LEVELS = {
    easy: { depth: 2, skill: 3 },
    medium: { depth: 6, skill: 10 },
    hard: { depth: 12, skill: 18 },
    max: { depth: 20, skill: 20 },
};

export { DIFFICULTY_LEVELS };

export default function useStockfish(difficulty = 'medium') {
    const workerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [bestMove, setBestMove] = useState(null);
    const [isThinking, setIsThinking] = useState(false);
    const onMoveRef = useRef(null);

    // Initialize Stockfish Web Worker
    useEffect(() => {
        const worker = new Worker('/stockfish/stockfish.js');
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const message = event.data;

            if (message === 'uciok') {
                // Set skill level based on difficulty
                const level = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
                worker.postMessage(`setoption name Skill Level value ${level.skill}`);
                worker.postMessage('isready');
            }

            if (message === 'readyok') {
                setIsReady(true);
            }

            // Parse best move response
            if (typeof message === 'string' && message.startsWith('bestmove')) {
                const move = message.split(' ')[1];
                if (move && move !== '(none)') {
                    setBestMove(move);
                    setIsThinking(false);
                    if (onMoveRef.current) {
                        onMoveRef.current(move);
                    }
                }
            }
        };

        // Start UCI protocol
        worker.postMessage('uci');

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, [difficulty]);

    /**
     * Request best move from Stockfish
     * @param {string} positionString - UCI position string e.g. "position startpos moves e2e4 e7e5"
     * @param {function} onMove - Callback when move is found
     */
    const requestMove = useCallback((positionString, onMove) => {
        if (!workerRef.current || !isReady) return;

        const level = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;

        setIsThinking(true);
        setBestMove(null);
        onMoveRef.current = onMove;

        workerRef.current.postMessage(positionString);
        workerRef.current.postMessage(`go depth ${level.depth}`);
    }, [isReady, difficulty]);

    /**
     * Reset the engine for a new game
     */
    const resetEngine = useCallback(() => {
        if (!workerRef.current) return;
        workerRef.current.postMessage('ucinewgame');
        workerRef.current.postMessage('isready');
        setBestMove(null);
        setIsThinking(false);
    }, []);

    return {
        isReady,
        isThinking,
        bestMove,
        requestMove,
        resetEngine,
    };
}
