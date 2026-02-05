/**
 * Error Handling Middleware
 * Centralized error handling for the entire application
 * Single Responsibility: Only handles errors
 */

const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Convert non-ApiError errors to ApiError
 */
const errorConverter = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        error = new ApiError(statusCode, message, false);
    }

    next(error);
};

/**
 * Handle and send error response
 */
const errorHandler = (err, req, res, next) => {
    const { statusCode, message, status } = err;

    // Log error in development
    if (!config.isProduction) {
        console.error('Error:', err);
    }

    // Don't leak error details in production for non-operational errors
    const response = {
        status,
        message: config.isProduction && !err.isOperational 
            ? 'Internal Server Error' 
            : message,
        ...(config.isProduction ? {} : { stack: err.stack }),
    };

    res.status(statusCode).json(response);
};

/**
 * Handle 404 - Route not found
 */
const notFoundHandler = (req, res, next) => {
    next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = {
    errorConverter,
    errorHandler,
    notFoundHandler,
};
