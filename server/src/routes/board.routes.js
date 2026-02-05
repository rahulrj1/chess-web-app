/**
 * Board Routes
 * Defines routes for game board endpoints
 */

const express = require('express');
const boardController = require('../controllers/board.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateDeleteBoard } = require('../middleware/validate.middleware');

const router = express.Router();

// POST /deleteboard - Delete a game board (requires Authorization: Bearer <token>)
router.post(
    '/',
    verifyToken,
    validateDeleteBoard,
    boardController.deleteBoard
);

module.exports = router;
