/**
 * Application Entry Point
 * Bootstraps the entire application
 */

const http = require('http');
const app = require('./app');
const config = require('./config');
const { connectDB, closeDB } = require('./config/db');
const { initializeSocket } = require('./socket');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        server.close(() => {
            console.log('HTTP server closed');
        });

        await closeDB();
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error.message);
        process.exit(1);
    }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Start listening
        server.listen(config.port, () => {
            console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
