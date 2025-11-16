const express = require('express');
const { body, query } = require('express-validator');
const seoController = require('../controllers/seoController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const seoSettingsValidation = [
  body('siteName')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Site name must be between 2 and 100 characters'),
  body('siteDescription')
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Site description must be between 10 and 500 characters'),
  body('siteUrl')
    .isURL()
    .withMessage('Valid site URL is required'),
  body('defaultMetaTitle')
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 60 })
    .withMessage('Default meta title must be between 10 and 60 characters'),
  body('defaultMetaDescription')
    .notEmpty()
    .trim()
    .isLength({ min: 50, max: 160 })
    .withMessage('Default meta description must be between 50 and 160 characters'),
  body('organization.name')
    .notEmpty()
    .trim()
    .withMessage('Organization name is required')
];

const pageAnalysisValidation = [
  body('pageType')
    .optional()
    .isIn(['home', 'perk', 'category', 'custom'])
    .withMessage('Invalid page type'),
  body('pageIdentifier')
    .optional()
    .trim()
];

// PUBLIC ROUTES

// Serve sitemap.xml
router.get('/sitemap.xml', seoController.getSitemapContent);

// Serve robots.txt
router.get('/robots.txt', seoController.getRobotsContent);

// Get page SEO data (for frontend rendering)
router.get('/page-seo',
  query('pageType')
    .optional()
    .isIn(['home', 'perk', 'category', 'custom'])
    .withMessage('Invalid page type'),
  query('pageIdentifier')
    .optional()
    .trim(),
  seoController.getPageSeo
);

// ADMIN ROUTES (Authentication required)
router.use(authMiddleware.authenticate);
router.use(authMiddleware.adminOnly);

// Get current SEO settings
router.get('/settings', seoController.getSeoSettings);

// Update SEO settings
router.put('/settings',
  rateLimitMiddleware.createLimiter({ max: 10, windowMs: 60 * 1000 }),
  seoController.uploadSeoImages,
  seoSettingsValidation,
  seoController.updateSeoSettings
);

// Generate meta tags
router.post('/meta-tags',
  seoController.generateMetaTags
);

// Generate schema markup
router.post('/schema-markup',
  seoController.generateSchemaMarkup
);

// SEO analysis
router.post('/analyze',
  pageAnalysisValidation,
  seoController.analyzePage
);

// Regenerate sitemap
router.post('/regenerate-sitemap',
  rateLimitMiddleware.createLimiter({ max: 5, windowMs: 60 * 1000 }),
  seoController.regenerateSitemap
);

// Regenerate robots.txt
router.post('/regenerate-robots',
  rateLimitMiddleware.createLimiter({ max: 5, windowMs: 60 * 1000 }),
  seoController.regenerateRobotsTxt
);

module.exports = router;