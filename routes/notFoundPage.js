const express = require('express');
const router = express.Router();
const notFoundPageController = require('../controllers/notFoundPageController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { validate, validateQuery } = require('../middleware/validation');
const Joi = require('joi');

// Configure multer for image uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Validation Schemas
const update404Schema = Joi.object({
  pageTitle: Joi.string().trim().max(100),
  mainHeading: Joi.string().trim().max(200),
  description: Joi.string().trim(),
  ctaButton: Joi.object({
    text: Joi.string().trim().max(50).required(),
    link: Joi.string().trim().required()
  }),
  seo: Joi.object({
    metaTitle: Joi.string().trim().max(60).allow(''),
    metaDescription: Joi.string().trim().max(160).allow('')
  }),
  suggestedLinks: Joi.array().items(
    Joi.object({
      title: Joi.string().trim().required(),
      url: Joi.string().trim().required(),
      icon: Joi.string().trim().allow('', null)
    })
  ),
  status: Joi.string().valid('active', 'inactive')
});

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   GET /api/pages/404
 * @desc    Get active 404 page content (public)
 * @access  Public
 */
router.get(
  '/pages/404',
  notFoundPageController.getPublic404Page
);

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

/**
 * @route   GET /api/admin/pages/404
 * @desc    Get 404 page for editing
 * @access  Admin (super_admin, content_editor)
 */
router.get(
  '/admin/pages/404',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  notFoundPageController.getAdmin404Page
);

/**
 * @route   PUT /api/admin/pages/404
 * @desc    Update or create 404 page content
 * @access  Admin (super_admin, content_editor)
 */
router.put(
  '/admin/pages/404',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  validate(update404Schema),
  notFoundPageController.update404Page
);

/**
 * @route   POST /api/admin/pages/404/upload
 * @desc    Upload background image for 404 page
 * @access  Admin (super_admin, content_editor)
 */
router.post(
  '/admin/pages/404/upload',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  upload.single('backgroundImage'),
  notFoundPageController.upload404Image
);

/**
 * @route   DELETE /api/admin/pages/404/image
 * @desc    Delete background image from 404 page
 * @access  Admin (super_admin, content_editor)
 */
router.delete(
  '/admin/pages/404/image',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  notFoundPageController.delete404Image
);

module.exports = router;