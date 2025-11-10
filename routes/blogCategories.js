// routes/blogCategories.js

const express = require('express');
const { body, param, query } = require('express-validator');
const blogCategoryController = require('../controllers/blogCategoryController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Blog category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Invalid status'),
  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
];

const generateSlugValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name is required and must be between 2 and 100 characters')
];

// MongoDB ID validation
const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid blog category ID')
];

const slugValidation = [
  param('slug').matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid slug format')
];

// Public routes (no authentication required)
router.get('/public', blogCategoryController.getCategoriesPublic);
router.get('/menu', blogCategoryController.getMenuCategories);
router.get('/featured', blogCategoryController.getFeaturedCategories);
router.get('/search', blogCategoryController.searchCategories);
router.get('/slug/:slug', slugValidation, blogCategoryController.getCategoryBySlug);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

// Admin only routes
router.use(authMiddleware.adminOnly);

// Blog category CRUD operations
router.post('/', 
  rateLimitMiddleware.categoryCreationLimiter,
  blogCategoryController.uploadSingle,
  createCategoryValidation,
  blogCategoryController.createCategory
);

router.get('/', blogCategoryController.getCategories);

router.get('/:id', mongoIdValidation, blogCategoryController.getCategoryById);

router.put('/:id', 
  mongoIdValidation,
  blogCategoryController.uploadSingle,
  createCategoryValidation,
  blogCategoryController.updateCategory
);

router.delete('/:id', mongoIdValidation, blogCategoryController.deleteCategory);

// Image upload
router.post('/:id/upload-image',
  mongoIdValidation,
  blogCategoryController.uploadSingle,
  blogCategoryController.uploadCategoryImage
);

// Utility routes
router.get('/validate-slug/:slug', slugValidation, blogCategoryController.validateSlug);

router.post('/generate-slug',
  generateSlugValidation,
  blogCategoryController.generateSlug
);

router.post('/:id/update-counters', 
  mongoIdValidation,
  blogCategoryController.updateCategoryCounters
);

// SEO Audit routes
router.get('/admin/seo/audit-dashboard',
  blogCategoryController.getSeoAuditDashboard
);

router.get('/admin/:id/seo-audit',
  mongoIdValidation,
  blogCategoryController.getSeoAudit
);

module.exports = router;