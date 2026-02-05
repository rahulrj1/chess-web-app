/**
 * Authentication Middleware
 * Handles JWT verification for protected routes
 * Single Responsibility: Only handles authentication
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Verify JWT token from Authorization header
 * Standard approach: Authorization: Bearer <token>
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded.id;
        next();
    } catch (error) {
        throw ApiError.unauthorized('Invalid token');
    }
};

module.exports = {
    verifyToken,
};
