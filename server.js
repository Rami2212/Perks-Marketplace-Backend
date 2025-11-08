// server.js

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
const { analyticsMiddleware } = require('./middleware/analytics');
const { seoMiddleware } = require('./middleware/seoMiddleware');

// Import routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const leadRoutes = require('./routes/leads');
const perkRoutes = require('./routes/perks');
const blogCategoryRoutes = require('./routes/blogCategories');
const blogRoutes = require('./routes/blog');
const dashboardRoutes = require('./routes/dashboard');
const seoRoutes = require('./routes/seo');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Enable trust proxy for proper IP detection behind reverse proxies
app.set('trust proxy', 1);

// Rate limiting
app.use(rateLimitMiddleware.globalLimiter);

// Analytics middleware
//app.use(analyticsMiddleware);

// SEO middleware
//app.use(seoMiddleware());

app.use(async (req, res, next) => {
  try {
    if (!(await database.isHealthy())) {
      console.log('Waiting for MongoDB connection...');
      await database.connect();
    }
    next();
  } catch (err) {
    console.error('Request blocked — database unavailable:', err.message);
    res.status(503).json({ message: 'Database temporarily unavailable, please try again.' });
  }
});

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

    // Check Blog models
    let blogHealthy = false;
    try {
      const BlogPost = require('./models/BlogPost');
      const BlogCategory = require('./models/BlogCategory');
      await BlogPost.countDocuments().limit(1);
      await BlogCategory.countDocuments().limit(1);
      blogHealthy = true;
    } catch (err) {
      console.error('Blog models health check failed:', err);
    }

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected',
      cloudinary: cloudinaryHealthy ? 'connected' : 'disconnected',
      blogModels: blogHealthy ? 'initialized' : 'failed'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/categories`, categoryRoutes);
app.use(`/api/${apiVersion}/leads`, leadRoutes);
app.use(`/api/${apiVersion}/perks`, perkRoutes);
app.use(`/api/${apiVersion}/blog-categories`, blogCategoryRoutes);
app.use(`/api/${apiVersion}/blog`, blogRoutes);
app.use(`/api/${apiVersion}/dashboard`, dashboardRoutes);
app.use(`/api/${apiVersion}/seo`, seoRoutes);
app.use('/', seoRoutes);

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
      blogCategories: `/api/${apiVersion}/blog-categories`,
      blog: `/api/${apiVersion}/blog`,
      dashboard: `/api/${apiVersion}/dashboard`,
      seo: `/api/${apiVersion}/seo`,
      health: '/health'
    },
    seoEndpoints: {
      sitemap: `/sitemap.xml`,
      robots: `/robots.txt`
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
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

module.exports = app;