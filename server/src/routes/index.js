/**
 * Routes Index
 * Central place to mount all routes
 * Open/Closed Principle: Easy to add new route modules
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const boardRoutes = require('./board.routes');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Health check
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server Running...',
    });
});

// Auth routes (public)
router.use('/users', authRoutes);

// Get current user (protected)
router.get('/me', verifyToken, authController.getUser);

// Board routes
router.use('/deleteboard', boardRoutes);

module.exports = router;
