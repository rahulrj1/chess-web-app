/**
 * useSocket Hook
 * Manages socket.io connection lifecycle
 */

import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api';

export default function useSocket(roomId, initialPieces) {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const s = io(API_URL);
        setSocket(s);
        s.emit('join', roomId, initialPieces);

        return () => {
            s.disconnect();
        };
    }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

    const emit = useCallback((event, ...args) => {
        if (socket) {
            socket.emit(event, ...args);
        }
    }, [socket]);

    return { socket, emit };
}
