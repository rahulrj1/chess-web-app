/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 * Single Responsibility: Only handles request/response
 * Thin controller - delegates to service layer
 */

const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const config = require('../config');
const { AUTH_MESSAGES } = require('../utils/constants');

/**
 * Register new user
 * POST /users/register
 */
const register = catchAsync(async (req, res) => {
    const { name, id, email, password } = req.body;
    
    await authService.register({ name, id, email, password });
    
    res.status(201).redirect(config.frontendUrl);
});

/**
 * Login user
 * POST /users/login
 */
const login = catchAsync(async (req, res) => {
    const { id, password } = req.body;
    
    const { token, user } = await authService.login({ id, password });

    // Set cookie
    res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: config.jwtExpiresIn * 1000,
        secure: config.isProduction,
        sameSite: config.isProduction ? 'none' : 'lax',
    });

    res.json({
        token,
        user,
        msg: AUTH_MESSAGES.LOGIN_SUCCESS,
    });
});

/**
 * Get current user
 * GET /me (protected - requires verifyToken middleware)
 */
const getUser = catchAsync(async (req, res) => {
    const user = await authService.getUserById(req.userId);
    
    res.json({ user });
});

module.exports = {
    register,
    login,
    getUser,
};
