/**
 * Validation Middleware
 * Validates request data before it reaches controllers
 * Single Responsibility: Only handles validation
 */

const { isEmail } = require('validator');
const ApiError = require('../utils/ApiError');

/**
 * Validate registration data
 */
const validateRegistration = (req, res, next) => {
    const { name, id, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length === 0) {
        errors.push('Name is required');
    } else if (name.length > 50) {
        errors.push('Name cannot exceed 50 characters');
    }

    if (!id || id.trim().length === 0) {
        errors.push('Player ID is required');
    }

    if (!email || !isEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!password) {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
    }

    if (errors.length > 0) {
        throw ApiError.badRequest(errors.join(', '));
    }

    next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
    const { id, password } = req.body;
    const errors = [];

    if (!id || id.trim().length === 0) {
        errors.push('Player ID is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        throw ApiError.badRequest(errors.join(', '));
    }

    next();
};

/**
 * Validate board deletion request
 */
const validateDeleteBoard = (req, res, next) => {
    const { roomId } = req.body;

    if (!roomId) {
        throw ApiError.badRequest('Room ID is required');
    }

    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateDeleteBoard,
};
