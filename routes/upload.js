const express = require('express');
const router = express.Router();
const cloudinaryUpload = require('../middleware/cloudinaryUpload');
const cloudinaryConfig = require('../config/cloudinary');
const { AppError } = require('../middleware/errorHandler');
const { authenticate, requireRole, superAdminOnly } = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

/**
 * @route   POST /api/v1/upload/single
 * @desc    Upload single image
 * @access  Private
 */
router.post('/single',
  authenticate,
  cloudinaryUpload.uploadSingle('image', 'images', 'medium'),
  (req, res, next) => {
    try {
      if (!req.cloudinaryFile) {
        return next(new AppError('No file uploaded', 400, 'NO_FILE'));
      }

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: req.cloudinaryFile.url,
          publicId: req.cloudinaryFile.publicId,
          width: req.cloudinaryFile.width,
          height: req.cloudinaryFile.height,
          format: req.cloudinaryFile.format,
          size: req.cloudinaryFile.size
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/multiple
 * @desc    Upload multiple images
 * @access  Private
 */
router.post('/multiple',
  authenticate,
  cloudinaryUpload.uploadMultiple('images', 10, 'gallery', 'large'),
  (req, res, next) => {
    try {
      if (!req.cloudinaryFiles || req.cloudinaryFiles.length === 0) {
        return next(new AppError('No files uploaded', 400, 'NO_FILES'));
      }

      res.status(200).json({
        success: true,
        message: 'Images uploaded successfully',
        count: req.cloudinaryFiles.length,
        data: req.cloudinaryFiles.map(file => ({
          url: file.url,
          publicId: file.publicId,
          width: file.width,
          height: file.height,
          format: file.format,
          size: file.size
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/perk-images
 * @desc    Upload perk logo and banner
 * @access  Private
 */
router.post('/perk-images',
  authenticate,
  cloudinaryUpload.uploadPerkImages,
  (req, res, next) => {
    try {
      const { logo, banner } = req.uploadedFiles;

      if (!logo && !banner) {
        return next(new AppError('No images uploaded', 400, 'NO_FILES'));
      }

      res.status(200).json({
        success: true,
        message: 'Perk images uploaded successfully',
        data: {
          logo: logo ? {
            url: logo.url,
            publicId: logo.publicId,
            width: logo.width,
            height: logo.height
          } : null,
          banner: banner ? {
            url: banner.url,
            publicId: banner.publicId,
            width: banner.width,
            height: banner.height
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/blog-images
 * @desc    Upload blog post images
 * @access  Private
 */
router.post('/blog-images',
  authenticate,
  cloudinaryUpload.uploadBlogImages,
  (req, res, next) => {
    try {
      if (!req.cloudinaryFiles || req.cloudinaryFiles.length === 0) {
        return next(new AppError('No files uploaded', 400, 'NO_FILES'));
      }

      res.status(200).json({
        success: true,
        message: 'Blog images uploaded successfully',
        count: req.cloudinaryFiles.length,
        data: req.cloudinaryFiles.map(file => ({
          url: file.url,
          publicId: file.publicId,
          width: file.width,
          height: file.height
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar',
  authenticate,
  cloudinaryUpload.uploadSingle('avatar', 'avatars', 'thumbnail'),
  (req, res, next) => {
    try {
      if (!req.cloudinaryFile) {
        return next(new AppError('No file uploaded', 400, 'NO_FILE'));
      }

      // Here you would update the user's avatar in database
      // Example:
      // if (req.user.avatar?.publicId) {
      //   await cloudinaryConfig.deleteImage(req.user.avatar.publicId);
      // }
      // req.user.avatar = {
      //   url: req.cloudinaryFile.url,
      //   publicId: req.cloudinaryFile.publicId
      // };
      // await req.user.save();

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          url: req.cloudinaryFile.url,
          publicId: req.cloudinaryFile.publicId
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/upload/delete
 * @desc    Delete image from Cloudinary
 * @access  Private
 */
router.delete('/delete',
  authenticate,
  async (req, res, next) => {
    try {
      const { publicId } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const result = await cloudinaryConfig.deleteImage(publicId);

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/upload/delete-multiple
 * @desc    Delete multiple images from Cloudinary
 * @access  Private
 */
router.delete('/delete-multiple',
  authenticate,
  async (req, res, next) => {
    try {
      const { publicIds } = req.body;

      if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        return next(new AppError('Public IDs array is required', 400, 'MISSING_PUBLIC_IDS'));
      }

      const result = await cloudinaryConfig.deleteMultipleImages(publicIds);

      res.status(200).json({
        success: true,
        message: 'Images deleted successfully',
        data: {
          deletedCount: result.deletedCount,
          deleted: result.deleted
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/base64
 * @desc    Upload base64 encoded image
 * @access  Private
 */
router.post('/base64',
  authenticate,
  async (req, res, next) => {
    try {
      const { image, folder = 'images', preset = 'medium' } = req.body;

      if (!image) {
        return next(new AppError('Base64 image is required', 400, 'MISSING_IMAGE'));
      }

      const result = await cloudinaryConfig.uploadBase64(image, folder, preset);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/from-url
 * @desc    Upload image from URL
 * @access  Private
 */
router.post('/from-url',
  authenticate,
  async (req, res, next) => {
    try {
      const { imageUrl, folder = 'images', preset = 'medium' } = req.body;

      if (!imageUrl) {
        return next(new AppError('Image URL is required', 400, 'MISSING_URL'));
      }

      const result = await cloudinaryConfig.uploadFromUrl(imageUrl, folder, preset);

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/upload/metadata/:publicId
 * @desc    Get image metadata
 * @access  Public
 */
router.get('/metadata/:publicId',
  async (req, res, next) => {
    try {
      const publicId = req.params.publicId.replace(/:/g, '/');
      
      const metadata = await cloudinaryConfig.getImageDetails(publicId);

      res.status(200).json({
        success: true,
        data: metadata
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/generate-url
 * @desc    Generate optimized image URL
 * @access  Public
 */
router.post('/generate-url',
  async (req, res, next) => {
    try {
      const { publicId, options = {} } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const url = cloudinaryConfig.generateOptimizedUrl(publicId, options);

      res.status(200).json({
        success: true,
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/generate-responsive
 * @desc    Generate responsive image srcset
 * @access  Public
 */
router.post('/generate-responsive',
  async (req, res, next) => {
    try {
      const { publicId, sizes } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const srcset = cloudinaryConfig.generateResponsiveSrcSet(publicId, sizes);
      const urls = cloudinaryConfig.generateResponsiveUrls(publicId);

      res.status(200).json({
        success: true,
        data: {
          srcset,
          urls
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/with-effects
 * @desc    Generate image with effects
 * @access  Public
 */
router.post('/with-effects',
  async (req, res, next) => {
    try {
      const { publicId, effects } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      if (!effects || !Array.isArray(effects)) {
        return next(new AppError('Effects array is required', 400, 'MISSING_EFFECTS'));
      }

      const url = cloudinaryConfig.generateImageWithEffects(publicId, effects);

      res.status(200).json({
        success: true,
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/with-text
 * @desc    Generate image with text overlay
 * @access  Public
 */
router.post('/with-text',
  async (req, res, next) => {
    try {
      const { publicId, text, options = {} } = req.body;

      if (!publicId || !text) {
        return next(new AppError('Public ID and text are required', 400, 'MISSING_PARAMS'));
      }

      const url = cloudinaryConfig.generateImageWithText(publicId, text, options);

      res.status(200).json({
        success: true,
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/with-watermark
 * @desc    Generate image with watermark
 * @access  Public
 */
router.post('/with-watermark',
  async (req, res, next) => {
    try {
      const { publicId, watermarkPublicId, options = {} } = req.body;

      if (!publicId || !watermarkPublicId) {
        return next(new AppError('Public ID and watermark public ID are required', 400, 'MISSING_PARAMS'));
      }

      const url = cloudinaryConfig.generateImageWithWatermark(publicId, watermarkPublicId, options);

      res.status(200).json({
        success: true,
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/upload/usage-stats
 * @desc    Get Cloudinary usage statistics
 * @access  Private (Admin only)
 */
router.get('/usage-stats',
  authenticate,
  requireRole(['super_admin', 'content_editor']),
  async (req, res, next) => {
    try {
      const stats = await cloudinaryConfig.getUsageStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/convert-format
 * @desc    Convert image to different format
 * @access  Public
 */
router.post('/convert-format',
  async (req, res, next) => {
    try {
      const { publicId, format = 'webp', quality = 'auto' } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const url = cloudinaryConfig.generateConvertedImage(publicId, format, quality);

      res.status(200).json({
        success: true,
        data: { 
          url,
          format,
          quality
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/thumbnail
 * @desc    Generate thumbnail URL
 * @access  Public
 */
router.post('/thumbnail',
  async (req, res, next) => {
    try {
      const { publicId, width = 150, height = 150 } = req.body;

      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const url = cloudinaryConfig.generateThumbnailUrl(publicId, width, height);

      res.status(200).json({
        success: true,
        data: { url }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/upload/search
 * @desc    Search images by tag
 * @access  Private
 */
router.get('/search',
  authenticate,
  async (req, res, next) => {
    try {
      const { tag } = req.query;

      if (!tag) {
        return next(new AppError('Tag parameter is required', 400, 'MISSING_TAG'));
      }

      const results = await cloudinaryConfig.searchByTag(tag);

      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;