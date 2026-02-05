/**
 * Authentication Service
 * Handles all authentication-related business logic
 * Single Responsibility: Only handles auth operations
 * Dependency Inversion: Controllers depend on this service, not models directly
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { AUTH_MESSAGES } = require('../utils/constants');

/**
 * Create JWT token
 */
const createToken = (userId) => {
    return jwt.sign(
        { id: userId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

/**
 * Register a new user
 */
const register = async ({ name, id, email, password }) => {
    // Check if email exists
    const emailExists = await User.findOne({ playerEmailId: email });
    if (emailExists) {
        throw ApiError.badRequest('User with this email already exists');
    }

    // Check if player ID exists
    const playerIdExists = await User.findOne({ playerId: id });
    if (playerIdExists) {
        throw ApiError.badRequest('User with this player ID already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        playerName: name,
        playerId: id,
        playerEmailId: email,
        playerPassword: hashedPassword,
    });

    return user.toPublicProfile();
};

/**
 * Login user
 */
const login = async ({ id, password }) => {
    // Find user with password field
    const user = await User.findByPlayerId(id);
    
    if (!user) {
        throw ApiError.unauthorized(AUTH_MESSAGES.LOGIN_FAILED);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.playerPassword);
    
    if (!isValidPassword) {
        throw ApiError.unauthorized('Password is incorrect');
    }

    // Create token
    const token = createToken(user._id);

    return {
        token,
        user: user.toPublicProfile(),
    };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
    const user = await User.findById(userId);
    return user ? user.toPublicProfile() : null;
};

module.exports = {
    createToken,
    register,
    login,
    getUserById,
};
