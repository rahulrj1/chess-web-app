/**
 * Application Configuration
 * Single source of truth for all environment variables
 */

require('dotenv').config();

const config = {
    // Server
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Database
    dbUri: process.env.DB_CONNECT,
    
    // JWT
    jwtSecret: process.env.TOKEN,
    jwtExpiresIn: 3 * 24 * 60 * 60, // 3 days in seconds
    
    // Frontend
    frontendUrl: process.env.FRONTEND || 'http://localhost:3000',
    
    // Derived
    isProduction: process.env.NODE_ENV === 'production',
};

// Validate required environment variables
const requiredEnvVars = ['DB_CONNECT', 'TOKEN'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config;
