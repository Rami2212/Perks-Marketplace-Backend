// routes/site.js
const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Get homepage settings
router.get('/homepage', siteController.getHomepageSettings);

// Get about page
router.get('/pages/about', siteController.getAboutPage);

// Get featured partners
router.get('/partners/featured', siteController.getFeaturedPartners);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Update homepage settings
router.put(
  '/admin/homepage',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  siteController.updateHomepageSettings
);

// Upload homepage images
router.post(
  '/admin/homepage/upload',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  uploadMiddleware.fields([
    { name: 'heroBackground', maxCount: 1 },
    { name: 'section1Image', maxCount: 1 },
    { name: 'section2Image', maxCount: 1 },
    { name: 'section3Image', maxCount: 1 }
  ]),
  uploadMiddleware.handleMulterError,
  siteController.uploadHomepageImages
);

// Update about page
router.put(
  '/admin/pages/about',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  siteController.updateAboutPage
);

// Upload about page hero image
router.post(
  '/admin/pages/about/upload',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  uploadMiddleware.single('heroImage'),
  uploadMiddleware.handleMulterError,
  siteController.uploadAboutPageImage
);

// Toggle partner featured status
router.put(
  '/admin/partners/:id/feature',
  authMiddleware.authenticate,
  authMiddleware.adminOnly,
  siteController.togglePartnerFeatured
);

module.exports = router;