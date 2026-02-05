/**
 * Board Controller
 * Handles HTTP requests for game board operations
 * Single Responsibility: Only handles request/response
 */

const gameService = require('../services/game.service');
const catchAsync = require('../utils/catchAsync');

/**
 * Delete a game board
 * POST /deleteboard
 */
const deleteBoard = catchAsync(async (req, res) => {
    const { roomId } = req.body;
    
    const result = await gameService.deleteBoard(roomId);
    
    res.status(200).json(result);
});

module.exports = {
    deleteBoard,
};
