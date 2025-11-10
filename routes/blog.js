// routes/blog.js

const express = require('express');
const { body, param, query } = require('express-validator');
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');

const router = express.Router();

// Validation rules
const createPostValidation = [
  body('title')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('excerpt')
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Excerpt must be between 10 and 500 characters'),
  body('content')
    .notEmpty()
    .trim()
    .withMessage('Content is required'),
  body('author.name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Author name must be between 2 and 100 characters'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('isVisible')
    .optional()
    .isBoolean()
    .withMessage('isVisible must be a boolean')
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
  param('id').isMongoId().withMessage('Invalid blog post ID')
];

const slugValidation = [
  param('slug').matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Invalid slug format')
];

// PUBLIC ROUTES (No authentication required)

// Get published blog posts
router.get('/', blogController.getPublishedPosts);

// Search blog posts
router.get('/search', 
  rateLimitMiddleware.searchLimiter,
  blogController.searchPosts
);

// Get blog post by slug
router.get('/slug/:slug', 
  slugValidation,
  blogController.getPostBySlug
);

// Get blog posts by category
router.get('/category/:categoryId', 
  param('categoryId').isMongoId().withMessage('Invalid category ID'),
  blogController.getPostsByCategory
);

// Track blog post share
router.post('/:id/share',
  mongoIdValidation,
  rateLimitMiddleware.createLimiter({ max: 100, windowMs: 60 * 1000 }),
  blogController.trackShare
);

// Track blog post click
router.post('/:id/click',
  mongoIdValidation,
  rateLimitMiddleware.createLimiter({ max: 100, windowMs: 60 * 1000 }),
  blogController.trackClick
);

// ADMIN ROUTES (Authentication required)
router.use(authMiddleware.authenticate);
router.use(authMiddleware.adminOnly);

// Get all blog posts (Admin)
router.get('/admin/all', blogController.getPosts);

// Get blog post statistics
router.get('/admin/stats', blogController.getPostStats);

// Create blog post
router.post('/admin', 
  rateLimitMiddleware.createLimiter({ max: 50, windowMs: 60 * 1000 }),
  blogController.uploadFiles,
  createPostValidation,
  blogController.createPost
);

// Get blog post by ID (Admin)
router.get('/admin/:id', 
  mongoIdValidation,
  blogController.getPostById
);

// Update blog post (Admin)
router.put('/admin/:id', 
  mongoIdValidation,
  blogController.uploadFiles,
  createPostValidation,
  blogController.updatePost
);

// Delete blog post (Admin)
router.delete('/admin/:id', 
  mongoIdValidation,
  blogController.deletePost
);

// Remove gallery image
router.delete('/admin/:id/gallery',
  mongoIdValidation,
  body('publicId').notEmpty().withMessage('Image public ID is required'),
  blogController.removeGalleryImage
);

// Utility routes
router.get('/admin/validate-slug/:slug', 
  slugValidation,
  blogController.validateSlug
);

router.post('/admin/generate-slug',
  generateSlugValidation,
  blogController.generateSlug
);

// SEO Audit routes
router.get('/admin/seo/audit-dashboard',
  blogController.getSeoAuditDashboard
);

router.get('/admin/seo/critical-issues',
  blogController.getCriticalSeoIssues
);

router.get('/admin/seo/duplicate-slugs',
  blogController.getDuplicateSlugs
);

router.get('/admin/:id/seo-audit',
  mongoIdValidation,
  blogController.getSeoAudit
);

module.exports = router;