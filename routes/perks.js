const express = require('express');
const { body, param, query } = require('express-validator');
const perkController = require('../controllers/perkController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const { analyticsMiddleware } = require('../middleware/analytics');

const router = express.Router();

// Validation rules
const createPerkValidation = [
  body('title')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('shortDescription')
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Short description must be between 10 and 2000 characters'),
  body('categoryId')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('vendor.name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Vendor name must be between 2 and 100 characters'),
  body('vendor.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid vendor email is required'),
  body('vendor.website')
    .optional()
    .isURL()
    .withMessage('Valid website URL is required'),
  body('value')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Perk value is required'),
  body('redemption.type')
    .isIn(['code', 'link', 'email', 'phone', 'visit'])
    .withMessage('Invalid redemption type'),
  body('redemption.instructions')
    .notEmpty()
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Redemption instructions must be between 5 and 1000 characters'),
  body('redemption.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Valid expiry date is required'),
  body('availability.endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
];

const updateSEOValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot be more than 60 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot be more than 160 characters'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywords.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each keyword must be between 1 and 50 characters'),
  body('ogTitle')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('OG title cannot be more than 60 characters'),
  body('ogDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('OG description cannot be more than 160 characters')
];

const rejectPerkValidation = [
  body('reason')
    .notEmpty()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Rejection reason must be between 5 and 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot be more than 1000 characters')
];

const generateSlugValidation = [
  body('title')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title is required and must be between 3 and 200 characters')
];

// MongoDB ID validation
const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid perk ID')
];

const slugValidation = [
  param('slug').matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid slug format')
];

// PUBLIC ROUTES (No authentication required)

// Get active perks
router.get('/', perkController.getActivePerks);

// Get perk by ID
router.get('/:id', 
  mongoIdValidation,
  analyticsMiddleware,
  perkController.getPerkByIdPublic
);

// Get featured perks
router.get('/featured', perkController.getFeaturedPerks);

// Search perks
router.get('/search', 
  rateLimitMiddleware.searchLimiter,
  perkController.searchPerks
);

// Get perk by slug
router.get('/slug/:slug', 
  slugValidation,
  analyticsMiddleware,
  perkController.getPerkBySlug
);

// Get perks by category
router.get('/category/:categoryId', 
  param('categoryId').isMongoId().withMessage('Invalid category ID'),
  perkController.getPerksByCategory
);

// Track perk click
router.post('/:id/click',
  mongoIdValidation,
  rateLimitMiddleware.createLimiter({ max: 100, windowMs: 60 * 1000 }),
  perkController.trackClick
);

// CLIENT ROUTES (Authentication required - Client can edit their own perks)
router.use(authMiddleware.authenticate);

// Get client's own perks
//router.get('/my-perks', perkController.getClientPerks);

// ADMIN ROUTES (Admin only)
router.use(authMiddleware.adminOnly);

// Get all perks (Admin)
router.get('/admin/all', perkController.getPerks);

// Get perk statistics
router.get('/admin/stats', perkController.getPerkStats);

// Get expiring perks
router.get('/admin/expiring',
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  perkController.getExpiringSoon
);

// Create perk
router.post('/admin', 
  rateLimitMiddleware.createLimiter({ max: 50, windowMs: 60 * 1000 }),
  perkController.uploadFiles,
  createPerkValidation,
  perkController.createPerk
);

// Get perk by ID (Admin)
router.get('/admin/:id', 
  mongoIdValidation,
  perkController.getPerkById
);

// Update perk (Admin)
router.put('/admin/:id', 
  mongoIdValidation,
  perkController.uploadFiles,
  createPerkValidation,
  perkController.updatePerk
);

// Update perk SEO (Client can edit SEO for their own perks)
router.put('/:id/seo',
  mongoIdValidation,
  updateSEOValidation,
  perkController.updatePerkSEO
);

// Delete perk (Admin)
router.delete('/admin/:id', 
  mongoIdValidation,
  perkController.deletePerk
);

// Approve perk
router.post('/admin/:id/approve',
  mongoIdValidation,
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes cannot be more than 1000 characters'),
  perkController.approvePerk
);

// Reject perk
router.post('/admin/:id/reject',
  mongoIdValidation,
  rejectPerkValidation,
  perkController.rejectPerk
);

// Utility routes
router.get('/admin/validate-slug/:slug', 
  slugValidation,
  perkController.validateSlug
);

router.post('/admin/generate-slug',
  generateSlugValidation,
  perkController.generateSlug
);

module.exports = router;