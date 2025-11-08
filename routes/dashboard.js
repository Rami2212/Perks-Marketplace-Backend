const express = require('express');
const { query } = require('express-validator');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('period')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', '365d'])
    .withMessage('Period must be one of: 1d, 7d, 30d, 90d, 365d')
];

const exportValidation = [
  ...dateRangeValidation,
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
  query('module')
    .optional()
    .isIn(['overview', 'perks', 'categories', 'leads', 'ga4', 'blog'])
    .withMessage('Module must be one of: overview, perks, categories, leads, ga4, blog')
];

// Apply authentication to all dashboard routes
router.use(authMiddleware.authenticate);

// Apply rate limiting to prevent abuse
router.use(rateLimitMiddleware.createLimiter({ 
  max: 100, 
  windowMs: 60 * 1000,
  message: 'Too many dashboard requests, please try again later'
}));

// ADMIN ROUTES (Admin and Manager access)
router.use(authMiddleware.adminOnly);

// Dashboard Overview
router.get('/',
  dateRangeValidation,
  dashboardController.getDashboardOverview
);

// Module-specific analytics
router.get('/perks',
  dateRangeValidation,
  dashboardController.getPerkAnalytics
);

router.get('/categories',
  dateRangeValidation,
  dashboardController.getCategoryAnalytics
);

router.get('/leads',
  dateRangeValidation,
  dashboardController.getLeadAnalytics
);

router.get('/analytics',
  dateRangeValidation,
  dashboardController.getGA4Analytics
);

router.get('/blog',
  dateRangeValidation,
  dashboardController.getBlogAnalytics
);

// Activity and Performance
router.get('/activity',
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  dashboardController.getRecentActivity
);

router.get('/performance',
  dateRangeValidation,
  dashboardController.getPerformanceMetrics
);

// Analytics Summary (lightweight for widgets/mobile)
router.get('/summary',
  query('period')
    .optional()
    .isIn(['1d', '7d', '30d'])
    .withMessage('Summary period must be 1d, 7d, or 30d'),
  dashboardController.getAnalyticsSummary
);

// Export Analytics Data
router.get('/export',
  rateLimitMiddleware.createLimiter({ 
    max: 10, 
    windowMs: 60 * 1000,
    message: 'Too many export requests, please try again later'
  }),
  exportValidation,
  dashboardController.exportAnalytics
);

module.exports = router;