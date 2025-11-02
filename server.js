require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import configuration
const database = require('./config/database');
const { app: appConfig } = require('./config');

// Import middleware
const { errorHandler, notFound, setupGlobalHandlers } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');
const corsMiddleware = require('./middleware/cors');
const loggingMiddleware = require('./middleware/logging');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const leadRoutes = require('./routes/leads');
const perkRoutes = require('./routes/perks');

const app = express();

// Setup global error handlers
setupGlobalHandlers();

// Security middleware
app.use(helmet(appConfig.getSecurityConfig().helmet));

// CORS configuration
app.use(corsMiddleware.getCorsMiddleware());

// General middleware
app.use(compression());

// Logging middleware
const logger = loggingMiddleware.getLogger();
if (Array.isArray(logger)) {
  logger.forEach(log => app.use(log));
} else {
  app.use(logger);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable trust proxy for proper IP detection behind reverse proxies
app.set('trust proxy', 1);

// Rate limiting
app.use(rateLimitMiddleware.globalLimiter);

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/categories`, categoryRoutes);
app.use(`/api/${apiVersion}/leads`, leadRoutes);
app.use(`/api/${apiVersion}/perks`, perkRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Connect to database if not already connected
    await database.connect();
    const dbHealthy = await database.isHealthy();
    
    // Optional: Check Cloudinary connectivity
    let cloudinaryHealthy = false;
    try {
      const cloudinaryConfig = require('./config/cloudinary');
      await cloudinaryConfig.cloudinary.api.ping();
      cloudinaryHealthy = true;
    } catch (err) {
      console.error('Cloudinary health check failed:', err);
    }

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected',
      cloudinary: cloudinaryHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API info endpoint
app.get(`/api/${apiVersion}`, (req, res) => {
  res.json({
    name: 'Perks Marketplace API',
    version: apiVersion,
    description: 'API for managing perks, deals, and marketplace functionality',
    endpoints: {
      auth: `/api/${apiVersion}/auth`,
      categories: `/api/${apiVersion}/categories`,
      leads: `/api/${apiVersion}/leads`,
      perks: `/api/${apiVersion}/perks`,
      health: '/health'
    },
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    timestamp: new Date().toISOString()
  });
});

// Middleware to ensure database connection for each request
app.use(async (req, res, next) => {
  try {
    await database.connect();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed'
      }
    });
  }
});

// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Export the Express app for Vercel
module.exports = app;