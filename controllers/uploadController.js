// controllers/uploadController.js
const uploadService = require('../services/uploadService');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Upload single image
 * @route   POST /api/v1/upload/single
 * @access  Private
 */
exports.uploadSingle = async (req, res, next) => {
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
};

/**
 * @desc    Upload multiple images
 * @route   POST /api/v1/upload/multiple
 * @access  Private
 */
exports.uploadMultiple = async (req, res, next) => {
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
};

/**
 * @desc    Upload perk images (logo + banner)
 * @route   POST /api/v1/upload/perk-images
 * @access  Private
 */
exports.uploadPerkImages = async (req, res, next) => {
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
          height: logo.height,
          format: logo.format,
          size: logo.size
        } : null,
        banner: banner ? {
          url: banner.url,
          publicId: banner.publicId,
          width: banner.width,
          height: banner.height,
          format: banner.format,
          size: banner.size
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload blog images
 * @route   POST /api/v1/upload/blog-images
 * @access  Private
 */
exports.uploadBlogImages = async (req, res, next) => {
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
};

/**
 * @desc    Upload user avatar
 * @route   POST /api/v1/upload/avatar
 * @access  Private
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.cloudinaryFile) {
      return next(new AppError('No file uploaded', 400, 'NO_FILE'));
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: req.cloudinaryFile.url,
        publicId: req.cloudinaryFile.publicId,
        width: req.cloudinaryFile.width,
        height: req.cloudinaryFile.height
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete single image
 * @route   DELETE /api/v1/upload/delete
 * @access  Private
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    const result = await uploadService.deleteSingleImage(publicId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete multiple images
 * @route   DELETE /api/v1/upload/delete-multiple
 * @access  Private
 */
exports.deleteMultipleImages = async (req, res, next) => {
  try {
    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return next(new AppError('Public IDs array is required', 400, 'MISSING_PUBLIC_IDS'));
    }

    const result = await uploadService.deleteMultipleImages(publicIds);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload base64 image
 * @route   POST /api/v1/upload/base64
 * @access  Private
 */
exports.uploadBase64 = async (req, res, next) => {
  try {
    const { image, folder = 'images', preset = 'medium' } = req.body;

    if (!image) {
      return next(new AppError('Base64 image is required', 400, 'MISSING_IMAGE'));
    }

    const result = await uploadService.uploadFromBase64(image, folder, preset);

    res.status(200).json({
      ...result,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload from URL
 * @route   POST /api/v1/upload/from-url
 * @access  Private
 */
exports.uploadFromUrl = async (req, res, next) => {
  try {
    const { imageUrl, folder = 'images', preset = 'medium' } = req.body;

    if (!imageUrl) {
      return next(new AppError('Image URL is required', 400, 'MISSING_URL'));
    }

    const result = await uploadService.uploadFromUrl(imageUrl, folder, preset);

    res.status(200).json({
      ...result,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get image metadata
 * @route   GET /api/v1/upload/metadata/:publicId
 * @access  Public
 */
exports.getMetadata = async (req, res, next) => {
  try {
    const publicId = req.params.publicId.replace(/:/g, '/');
    
    const result = await uploadService.getImageMetadata(publicId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate optimized image URL
 * @route   POST /api/v1/upload/generate-url
 * @access  Public
 */
exports.generateOptimizedUrl = async (req, res, next) => {
  try {
    const { publicId, options = {} } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    const result = uploadService.generateOptimizedUrl(publicId, options);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate responsive image URLs
 * @route   POST /api/v1/upload/generate-responsive
 * @access  Public
 */
exports.generateResponsiveUrls = async (req, res, next) => {
  try {
    const { publicId, sizes } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    const result = uploadService.generateResponsiveUrls(publicId, sizes);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate image with effects
 * @route   POST /api/v1/upload/with-effects
 * @access  Public
 */
exports.generateImageWithEffects = async (req, res, next) => {
  try {
    const { publicId, effects } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    if (!effects || !Array.isArray(effects)) {
      return next(new AppError('Effects array is required', 400, 'MISSING_EFFECTS'));
    }

    const result = uploadService.generateImageWithEffects(publicId, effects);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate image with text overlay
 * @route   POST /api/v1/upload/with-text
 * @access  Public
 */
exports.generateImageWithText = async (req, res, next) => {
  try {
    const { publicId, text, options = {} } = req.body;

    if (!publicId || !text) {
      return next(new AppError('Public ID and text are required', 400, 'MISSING_PARAMS'));
    }

    const result = uploadService.generateImageWithText(publicId, text, options);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate image with watermark
 * @route   POST /api/v1/upload/with-watermark
 * @access  Public
 */
exports.generateImageWithWatermark = async (req, res, next) => {
  try {
    const { publicId, watermarkPublicId, options = {} } = req.body;

    if (!publicId || !watermarkPublicId) {
      return next(new AppError('Public ID and watermark public ID are required', 400, 'MISSING_PARAMS'));
    }

    const result = uploadService.generateImageWithWatermark(publicId, watermarkPublicId, options);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Cloudinary usage statistics
 * @route   GET /api/v1/upload/usage-stats
 * @access  Private (Admin only)
 */
exports.getUsageStats = async (req, res, next) => {
  try {
    const result = await uploadService.getUsageStats();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Convert image format
 * @route   POST /api/v1/upload/convert-format
 * @access  Public
 */
exports.convertImageFormat = async (req, res, next) => {
  try {
    const { publicId, format = 'webp', quality = 'auto' } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    const result = uploadService.generateConvertedImage(publicId, format, quality);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate thumbnail URL
 * @route   POST /api/v1/upload/thumbnail
 * @access  Public
 */
exports.generateThumbnail = async (req, res, next) => {
  try {
    const { publicId, width = 150, height = 150 } = req.body;

    if (!publicId) {
      return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
    }

    const result = uploadService.generateThumbnail(publicId, width, height);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search images by tag
 * @route   GET /api/v1/upload/search
 * @access  Private
 */
exports.searchByTag = async (req, res, next) => {
  try {
    const { tag } = req.query;

    if (!tag) {
      return next(new AppError('Tag parameter is required', 400, 'MISSING_TAG'));
    }

    const result = await uploadService.searchByTag(tag);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = exports;