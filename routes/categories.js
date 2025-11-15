const express = require('express');
const { body, param, query } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
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
  ,body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('SEO title cannot be more than 60 characters'),
  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('SEO description cannot be more than 160 characters'),
  body('seoKeywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array of strings')
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
  param('id').isMongoId().withMessage('Invalid category ID')
];

const slugValidation = [
  param('slug').matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid slug format')
];

// Public routes (no authentication required)
router.get('/tree', categoryController.getCategoryTree);
router.get('/menu', categoryController.getMenuCategories);
router.get('/filters', categoryController.getFilterCategories);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/search', categoryController.searchCategories);
router.get('/slug/:slug', slugValidation, categoryController.getCategoryBySlug);


router.get('/public', categoryController.getCategoriesPublic);
router.get('/:id', mongoIdValidation, categoryController.getCategoryByIdPublic);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

// Admin only routes
router.use(authMiddleware.adminOnly);

// Category CRUD operations
router.post('/', 
  rateLimitMiddleware.categoryCreationLimiter,
  categoryController.uploadSingle,
  createCategoryValidation,
  categoryController.createCategory
);

router.get('/', categoryController.getCategories);
router.get('/root', categoryController.getRootCategories);

router.get('/:id', mongoIdValidation, categoryController.getCategoryById);

router.put('/:id', 
  mongoIdValidation,
  categoryController.uploadSingle,
  createCategoryValidation,
  categoryController.updateCategory
);

router.delete('/:id', mongoIdValidation, categoryController.deleteCategory);

router.get('/:id/breadcrumb', mongoIdValidation, categoryController.getCategoryBreadcrumb);

router.get('/:parentId/subcategories', 
  param('parentId').isMongoId().withMessage('Invalid parent category ID'),
  categoryController.getSubcategories
);

// Image upload
router.post('/:id/upload-image',
  mongoIdValidation,
  categoryController.uploadSingle,
  categoryController.uploadCategoryImage
);

// Utility routes
router.get('/validate-slug/:slug', slugValidation, categoryController.validateSlug);

router.post('/generate-slug',
  generateSlugValidation,
  categoryController.generateSlug
);

router.post('/:id/update-counters', 
  mongoIdValidation,
  categoryController.updateCategoryCounters
);

// Update category status
router.post('/:id/update-status',
  mongoIdValidation,
    body('status')
      .notEmpty()
      .isIn(['active', 'inactive', 'draft'])
      .withMessage('Invalid status'),
    categoryController.updateCategoryStatus
);

router.post('/:id/track-view',
  mongoIdValidation,
  categoryController.trackCategoryView
);

module.exports = router;