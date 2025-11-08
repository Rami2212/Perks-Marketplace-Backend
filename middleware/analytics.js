const analyticsService = require('../services/analyticsService');

// Analytics tracking middleware
const analyticsMiddleware = (req, res, next) => {
  // Skip analytics completely for health and other non-authenticated routes
  const publicPaths = [
    '/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/verify',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/robots.txt',
    '/sitemap.xml'
  ];

  // Check if current path should skip analytics
  const shouldSkip = publicPaths.some(path => req.path === path || req.path.startsWith(path));
  
  if (shouldSkip) {
    return next();
  }

  // For all other routes, run the full analytics middleware
  return analyticsService.createTrackingMiddleware()(req, res, next);
};

module.exports = { analyticsMiddleware };