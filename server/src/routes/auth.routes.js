/**
 * Authentication Routes
 * Defines routes for authentication endpoints
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validate.middleware');

const router = express.Router();

// POST /users/register - Register new user
router.post('/register', validateRegistration, authController.register);

// POST /users/login - Login user
router.post('/login', validateLogin, authController.login);

module.exports = router;
