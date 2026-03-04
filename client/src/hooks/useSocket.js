/**
 * useSocket Hook
 * Manages socket.io connection lifecycle with reconnection support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api';

export default function useSocket(roomId, initialPieces) {
    const [socket, setSocket] = useState(null);
    const roomIdRef = useRef(roomId);
    const piecesRef = useRef(initialPieces);

    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
    useEffect(() => { piecesRef.current = initialPieces; }, [initialPieces]);

    useEffect(() => {
        const s = io(API_URL, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        setSocket(s);
        s.emit('join', roomId, initialPieces);

        s.on('connect', () => {
            // On reconnect (not the initial connect), re-join the room
            if (s.recovered) return;
            // socket.io fires 'connect' on initial and re-connections;
            // the first 'join' above handles initial, this handles reconnects
        });

        s.io.on('reconnect', () => {
            s.emit('join', roomIdRef.current, piecesRef.current);
        });

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
