/**
 * Database Configuration
 * Handles MongoDB connection with proper error handling
 */

const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
    try {
        await mongoose.connect(config.dbUri);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
});

// Graceful shutdown helper
const closeDB = async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
};

module.exports = { connectDB, closeDB };
