/**
 * Async Handler Wrapper
 * Eliminates try-catch boilerplate in controllers
 */

const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = catchAsync;
