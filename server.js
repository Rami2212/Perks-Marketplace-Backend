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
// Add your upload routes
const uploadRoutes = require('./routes/upload'); // You'll create this

const app = express();
const PORT = process.env.PORT || 3000;

// Setup global error handlers
setupGlobalHandlers();

// Connect to database
database.connect().catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

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

// Rate limiting
app.use(rateLimitMiddleware.globalLimiter);

// NOTE: You can remove this if you're fully migrated to Cloudinary
// app.use('/uploads', express.static('uploads'));

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes); // Add upload routes

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
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
      uptime: process.uptime(),
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
      upload: `/api/${apiVersion}/upload`,
      health: '/health'
    },
    documentation: `${req.protocol}://${req.get('host')}/docs`,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    database.disconnect().then(() => {
      console.log('Database connection closed.');
      process.exit(0);
    });
  });

  // Force close after 30s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Base URL: http://localhost:${PORT}/api/${apiVersion}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n📋 Available endpoints:`);
    console.log(`   POST /api/${apiVersion}/auth/login`);
    console.log(`   POST /api/${apiVersion}/auth/register`);
    console.log(`   GET  /api/${apiVersion}/auth/me`);
    console.log(`   POST /api/${apiVersion}/auth/refresh-token`);
    console.log(`   POST /api/${apiVersion}/auth/logout`);
    console.log(`   POST /api/${apiVersion}/upload/single`);
    console.log(`   POST /api/${apiVersion}/upload/multiple`);
    console.log(`   POST /api/${apiVersion}/upload/perk-images`);
    console.log(`   DELETE /api/${apiVersion}/upload/delete`);
    console.log(`   GET  /health`);
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

module.exports = app;