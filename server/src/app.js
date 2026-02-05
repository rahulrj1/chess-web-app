/**
 * Express Application Setup
 * Configures Express with all middleware and routes
 * Single Responsibility: Only handles Express configuration
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const config = require('./config');
const routes = require('./routes');
const { errorConverter, errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Trust proxy (for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// API routes
app.use('/', routes);

// Handle 404
app.use(notFoundHandler);

// Error handling
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
