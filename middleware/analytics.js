const analyticsService = require('../services/analyticsService');

// Analytics tracking middleware
const analyticsMiddleware = analyticsService.createTrackingMiddleware();

module.exports = { analyticsMiddleware };