const cloudinaryConfig = require('../config/cloudinary');

class CloudinaryUtils {
  /**
   * Upload image from URL
   */
  static async uploadFromUrl(imageUrl, folder = 'images', preset = 'medium') {
    try {
      const result = await cloudinaryConfig.uploadImage(
        { path: imageUrl },
        folder,
        preset
      );
      return result;
    } catch (error) {
      throw new Error(`Failed to upload from URL: ${error.message}`);
    }
  }

  /**
   * Upload base64 image
   */
  static async uploadBase64(base64String, folder = 'images', preset = 'medium') {
    try {
      const cloudinary = cloudinaryConfig.cloudinary;
      const transformations = cloudinaryConfig.getTransformationPresets()[preset];
      const options = cloudinaryConfig.getUploadOptions(folder, transformations);

      const result = await cloudinary.uploader.upload(base64String, {
        ...options,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes
      };
    } catch (error) {
      throw new Error(`Failed to upload base64 image: ${error.message}`);
    }
  }

  /**
   * Generate optimized image URL with custom transformations
   */
  static generateOptimizedUrl(publicId, options = {}) {
    const {
      width,
      height,
      crop = 'limit',
      quality = 'auto:good',
      format = 'auto',
      effects = []
    } = options;

    const transformations = [
      { quality, fetch_format: format }
    ];

    if (width || height) {
      transformations.unshift({
        width,
        height,
        crop
      });
    }

    effects.forEach(effect => {
      transformations.push(effect);
    });

    return cloudinaryConfig.cloudinary.url(publicId, {
      transformation: transformations
    });
  }

  /**
   * Generate responsive image srcset
   */
  static generateResponsiveSrcSet(publicId, sizes = [320, 640, 1024, 1920]) {
    const srcset = sizes.map(width => {
      const url = cloudinaryConfig.cloudinary.url(publicId, {
        transformation: [
          { width, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
        ]
      });
      return `${url} ${width}w`;
    });

    return srcset.join(', ');
  }

  /**
   * Generate image with effects
   */
  static generateImageWithEffects(publicId, effects = []) {
    const transformations = effects.map(effect => {
      switch (effect.type) {
        case 'blur':
          return { effect: `blur:${effect.value || 300}` };
        case 'grayscale':
          return { effect: 'grayscale' };
        case 'sepia':
          return { effect: 'sepia' };
        case 'brightness':
          return { effect: `brightness:${effect.value || 0}` };
        case 'contrast':
          return { effect: `contrast:${effect.value || 0}` };
        case 'saturation':
          return { effect: `saturation:${effect.value || 0}` };
        case 'sharpen':
          return { effect: `sharpen:${effect.value || 100}` };
        case 'pixelate':
          return { effect: `pixelate:${effect.value || 5}` };
        case 'oil_paint':
          return { effect: `oil_paint:${effect.value || 30}` };
        case 'vignette':
          return { effect: `vignette:${effect.value || 30}` };
        default:
          return null;
      }
    }).filter(Boolean);

    return cloudinaryConfig.cloudinary.url(publicId, {
      transformation: transformations
    });
  }

  /**
   * Add text overlay to image
   */
  static generateImageWithText(publicId, text, options = {}) {
    const {
      fontSize = 40,
      fontFamily = 'Arial',
      color = 'white',
      gravity = 'south',
      y = 20
    } = options;

    return cloudinaryConfig.cloudinary.url(publicId, {
      transformation: [
        {
          overlay: {
            font_family: fontFamily,
            font_size: fontSize,
            text: text
          },
          color: color,
          gravity: gravity,
          y: y
        }
      ]
    });
  }

  /**
   * Add watermark to image
   */
  static generateImageWithWatermark(publicId, watermarkPublicId, options = {}) {
    const {
      gravity = 'south_east',
      opacity = 50,
      width = 100,
      x = 10,
      y = 10
    } = options;

    return cloudinaryConfig.cloudinary.url(publicId, {
      transformation: [
        {
          overlay: watermarkPublicId,
          width: width,
          opacity: opacity,
          gravity: gravity,
          x: x,
          y: y
        }
      ]
    });
  }

  /**
   * Create image collage
   */
  static generateCollage(publicIds, layout = 'grid') {
    // This is a simplified version - Cloudinary has more complex collage options
    const basePublicId = publicIds[0];
    const overlays = publicIds.slice(1).map((id, index) => ({
      overlay: id,
      width: 300,
      height: 300,
      crop: 'fill',
      x: (index + 1) * 310,
      y: 0
    }));

    return cloudinaryConfig.cloudinary.url(basePublicId, {
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
        ...overlays
      ]
    });
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(publicId) {
    try {
      const result = await cloudinaryConfig.getImageDetails(publicId);
      return {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        url: result.secure_url,
        createdAt: result.created_at,
        resourceType: result.resource_type,
        type: result.type,
        colors: result.colors || []
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Batch delete images
   */
  static async batchDeleteImages(publicIds) {
    try {
      const result = await cloudinaryConfig.deleteMultipleImages(publicIds);
      return {
        deleted: result.deleted || {},
        deletedCount: Object.keys(result.deleted || {}).length
      };
    } catch (error) {
      throw new Error(`Failed to batch delete images: ${error.message}`);
    }
  }

  /**
   * Delete all images in a folder
   */
  static async deleteFolder(folderPath) {
    try {
      const cloudinary = cloudinaryConfig.cloudinary;
      
      // Get all resources in folder
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `perks-marketplace/${folderPath}`,
        max_results: 500
      });

      // Delete all resources
      const publicIds = result.resources.map(resource => resource.public_id);
      
      if (publicIds.length > 0) {
        await cloudinaryConfig.deleteMultipleImages(publicIds);
      }

      // Delete the folder
      await cloudinary.api.delete_folder(`perks-marketplace/${folderPath}`);

      return {
        deletedCount: publicIds.length,
        folderPath
      };
    } catch (error) {
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  /**
   * Search images by tag
   */
  static async searchByTag(tag) {
    try {
      const cloudinary = cloudinaryConfig.cloudinary;
      const result = await cloudinary.api.resources_by_tag(tag, {
        max_results: 500
      });

      return result.resources.map(resource => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        format: resource.format,
        width: resource.width,
        height: resource.height
      }));
    } catch (error) {
      throw new Error(`Failed to search by tag: ${error.message}`);
    }
  }

  /**
   * Get storage usage stats
   */
  static async getUsageStats() {
    try {
      const cloudinary = cloudinaryConfig.cloudinary;
      const result = await cloudinary.api.usage();

      return {
        plan: result.plan,
        credits: {
          used: result.credits.used,
          limit: result.credits.limit,
          usage_pct: result.credits.usage_pct
        },
        bandwidth: {
          used: result.bandwidth.used,
          limit: result.bandwidth.limit,
          usage_pct: result.bandwidth.usage_pct
        },
        storage: {
          used: result.storage.used,
          limit: result.storage.limit,
          usage_pct: result.storage.usage_pct
        },
        resources: result.resources,
        derived_resources: result.derived_resources
      };
    } catch (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  /**
   * Convert image format
   */
  static generateConvertedImage(publicId, targetFormat = 'webp', quality = 'auto') {
    return cloudinaryConfig.cloudinary.url(publicId, {
      transformation: [
        { quality: quality, fetch_format: targetFormat }
      ]
    });
  }

  /**
   * Create animated GIF from images
   */
  static async createAnimatedGif(publicIds, options = {}) {
    try {
      const cloudinary = cloudinaryConfig.cloudinary;
      const {
        delay = 100,
        width = 400,
        height = 400
      } = options;

      // Create base transformation with first image
      const transformations = [
        { width, height, crop: 'fill' }
      ];

      // Add overlays for subsequent images with delays
      publicIds.slice(1).forEach((id, index) => {
        transformations.push({
          overlay: id,
          width,
          height,
          crop: 'fill',
          delay: delay * (index + 1)
        });
      });

      const result = await cloudinary.uploader.multi(publicIds.join(';'), {
        transformation: transformations,
        format: 'gif'
      });

      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      throw new Error(`Failed to create animated GIF: ${error.message}`);
    }
  }
}

module.exports = CloudinaryUtils;