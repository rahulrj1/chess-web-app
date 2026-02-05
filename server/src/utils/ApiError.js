/**
 * Custom API Error Class
 * Provides consistent error handling across the application
 * Following Open/Closed Principle - extend for specific error types
 */

class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message = 'Bad Request') {
        return new ApiError(400, message);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Not Found') {
        return new ApiError(404, message);
    }

    static internal(message = 'Internal Server Error') {
        return new ApiError(500, message, false);
    }
}

module.exports = ApiError;
