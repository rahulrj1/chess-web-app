/**
 * Socket.io Setup
 * Configures and initializes Socket.io
 */

const { Server } = require('socket.io');
const config = require('../config');
const { handleJoin } = require('./handlers');
const { SOCKET_EVENTS } = require('../utils/constants');

/**
 * Initialize Socket.io server
 */
const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: [config.frontendUrl],
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Handle join event
        socket.on(SOCKET_EVENTS.JOIN, handleJoin(io, socket));

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = { initializeSocket };
