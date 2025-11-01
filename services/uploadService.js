// services/uploadService.js
const cloudinaryConfig = require('../config/cloudinary');
const CloudinaryUtils = require('../utils/cloudinaryUtils');

class UploadService {
  /**
   * Process single file upload
   */
  async processSingleUpload(file, folder = 'images', preset = 'medium') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      const result = await cloudinaryConfig.uploadImage(file, folder, preset);
      
      return {
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size,
          resourceType: result.resourceType,
          uploadedAt: result.createdAt
        }
      };
    } catch (error) {
      throw new Error(`Single upload failed: ${error.message}`);
    }
  }

  /**
   * Process multiple file uploads
   */
  async processMultipleUploads(files, folder = 'images', preset = 'medium') {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const results = await cloudinaryConfig.uploadMultipleImages(files, folder, preset);
      
      return {
        success: true,
        count: results.length,
        data: results.map(result => ({
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size
        }))
      };
    } catch (error) {
      throw new Error(`Multiple uploads failed: ${error.message}`);
    }
  }

  /**
   * Delete single image
   */
  async deleteSingleImage(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const result = await cloudinaryConfig.deleteImage(publicId);
      
      return {
        success: true,
        message: 'Image deleted successfully',
        data: result
      };
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds) {
    try {
      if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        throw new Error('Public IDs array is required');
      }

      const result = await CloudinaryUtils.batchDeleteImages(publicIds);
      
      return {
        success: true,
        message: 'Images deleted successfully',
        data: {
          deletedCount: result.deletedCount,
          deleted: result.deleted
        }
      };
    } catch (error) {
      throw new Error(`Batch delete failed: ${error.message}`);
    }
  }

  /**
   * Upload from base64 string
   */
  async uploadFromBase64(base64String, folder = 'images', preset = 'medium') {
    try {
      if (!base64String) {
        throw new Error('Base64 string is required');
      }

      const result = await CloudinaryUtils.uploadBase64(base64String, folder, preset);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      throw new Error(`Base64 upload failed: ${error.message}`);
    }
  }

  /**
   * Upload from URL
   */
  async uploadFromUrl(imageUrl, folder = 'images', preset = 'medium') {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      const result = await CloudinaryUtils.uploadFromUrl(imageUrl, folder, preset);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      throw new Error(`URL upload failed: ${error.message}`);
    }
  }

  /**
   * Generate optimized image URL
   */
  generateOptimizedUrl(publicId, options = {}) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const url = CloudinaryUtils.generateOptimizedUrl(publicId, options);
      
      return {
        success: true,
        data: { url }
      };
    } catch (error) {
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate responsive image URLs
   */
  generateResponsiveUrls(publicId, sizes) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const srcset = CloudinaryUtils.generateResponsiveSrcSet(publicId, sizes);
      const urls = cloudinaryConfig.generateResponsiveUrls(publicId);
      
      return {
        success: true,
        data: { srcset, urls }
      };
    } catch (error) {
      throw new Error(`Responsive URL generation failed: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const metadata = await CloudinaryUtils.getImageMetadata(publicId);
      
      return {
        success: true,
        data: metadata
      };
    } catch (error) {
      throw new Error(`Metadata retrieval failed: ${error.message}`);
    }
  }

  /**
   * Apply effects to image
   */
  generateImageWithEffects(publicId, effects = []) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      if (!Array.isArray(effects) || effects.length === 0) {
        throw new Error('Effects array is required');
      }

      const url = CloudinaryUtils.generateImageWithEffects(publicId, effects);
      
      return {
        success: true,
        data: { url }
      };
    } catch (error) {
      throw new Error(`Effects application failed: ${error.message}`);
    }
  }

  /**
   * Add text overlay to image
   */
  generateImageWithText(publicId, text, options = {}) {
    try {
      if (!publicId || !text) {
        throw new Error('Public ID and text are required');
      }

      const url = CloudinaryUtils.generateImageWithText(publicId, text, options);
      
      return {
        success: true,
        data: { url }
      };
    } catch (error) {
      throw new Error(`Text overlay failed: ${error.message}`);
    }
  }

  /**
   * Add watermark to image
   */
  generateImageWithWatermark(publicId, watermarkPublicId, options = {}) {
    try {
      if (!publicId || !watermarkPublicId) {
        throw new Error('Public ID and watermark public ID are required');
      }

      const url = CloudinaryUtils.generateImageWithWatermark(publicId, watermarkPublicId, options);
      
      return {
        success: true,
        data: { url }
      };
    } catch (error) {
      throw new Error(`Watermark application failed: ${error.message}`);
    }
  }

  /**
   * Get Cloudinary usage statistics
   */
  async getUsageStats() {
    try {
      const stats = await CloudinaryUtils.getUsageStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      throw new Error(`Usage stats retrieval failed: ${error.message}`);
    }
  }

  /**
   * Convert image format
   */
  generateConvertedImage(publicId, format = 'webp', quality = 'auto') {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const url = CloudinaryUtils.generateConvertedImage(publicId, format, quality);
      
      return {
        success: true,
        data: { url, format, quality }
      };
    } catch (error) {
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnail(publicId, width = 150, height = 150) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      const url = cloudinaryConfig.generateThumbnailUrl(publicId, width, height);
      
      return {
        success: true,
        data: { url }
      };
    } catch (error) {
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Search images by tag
   */
  async searchByTag(tag) {
    try {
      if (!tag) {
        throw new Error('Tag is required');
      }

      const results = await CloudinaryUtils.searchByTag(tag);
      
      return {
        success: true,
        count: results.length,
        data: results
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file, maxSize = 5242880, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate multiple files before upload
   */
  validateFiles(files, maxSize = 5242880, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxCount = 10) {
    const errors = [];

    if (!files || files.length === 0) {
      errors.push('No files provided');
      return { valid: false, errors };
    }

    if (files.length > maxCount) {
      errors.push(`Too many files. Maximum allowed: ${maxCount}`);
    }

    files.forEach((file, index) => {
      const validation = this.validateFile(file, maxSize, allowedTypes);
      if (!validation.valid) {
        errors.push(`File ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new UploadService();