const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

class CloudinaryConfig {
  constructor() {
    this.cloudinary = cloudinary;
  }

  // Upload options for different asset types
  getUploadOptions(folder = 'general', transformation = {}) {
    return {
      folder: `perks-marketplace/${folder}`,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      ...transformation
    };
  }

  // Image transformation presets
  getTransformationPresets() {
    return {
      thumbnail: {
        width: 150,
        height: 150,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto'
      },
      medium: {
        width: 500,
        height: 500,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      },
      large: {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:best',
        fetch_format: 'auto'
      },
      banner: {
        width: 1920,
        height: 600,
        crop: 'fill',
        gravity: 'center',
        quality: 'auto:best',
        fetch_format: 'auto'
      },
      logo: {
        width: 200,
        height: 200,
        crop: 'fit',
        quality: 'auto:best',
        fetch_format: 'auto',
        background: 'transparent'
      }
    };
  }

  // Upload image to Cloudinary
  async uploadImage(file, folder = 'images', preset = 'medium') {
    try {
      const transformations = this.getTransformationPresets()[preset];
      const options = this.getUploadOptions(folder, transformations);

      const result = await cloudinary.uploader.upload(file.path, {
        ...options,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        resourceType: result.resource_type,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
  }

  // Upload multiple images
  async uploadMultipleImages(files, folder = 'images', preset = 'medium') {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file, folder, preset)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Cloudinary multiple upload error:', error);
      throw new Error(`Failed to upload images to Cloudinary: ${error.message}`);
    }
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
    }
  }

  // Delete multiple images
  async deleteMultipleImages(publicIds) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return {
        deleted: result.deleted || {},
        deletedCount: Object.keys(result.deleted || {}).length
      };
    } catch (error) {
      console.error('Cloudinary multiple delete error:', error);
      throw new Error(`Failed to delete images from Cloudinary: ${error.message}`);
    }
  }

  // Get image details
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
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
      console.error('Cloudinary get details error:', error);
      throw new Error(`Failed to get image details from Cloudinary: ${error.message}`);
    }
  }

  // Generate thumbnail URL
  generateThumbnailUrl(publicId, width = 150, height = 150) {
    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop: 'fill', quality: 'auto:good' }
      ]
    });
  }

  // Generate responsive image URLs
  generateResponsiveUrls(publicId) {
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 300, height: 300 },
      { name: 'medium', width: 600, height: 600 },
      { name: 'large', width: 1200, height: 1200 }
    ];

    return sizes.reduce((urls, size) => {
      urls[size.name] = cloudinary.url(publicId, {
        transformation: [
          { 
            width: size.width, 
            height: size.height, 
            crop: 'limit', 
            quality: 'auto:good',
            fetch_format: 'auto'
          }
        ]
      });
      return urls;
    }, {});
  }

  // Generate optimized image URL with custom transformations
  generateOptimizedUrl(publicId, options = {}) {
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

    return cloudinary.url(publicId, {
      transformation: transformations
    });
  }

  // Generate responsive srcset
  generateResponsiveSrcSet(publicId, sizes = [320, 640, 1024, 1920]) {
    const srcset = sizes.map(width => {
      const url = cloudinary.url(publicId, {
        transformation: [
          { width, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
        ]
      });
      return `${url} ${width}w`;
    });

    return srcset.join(', ');
  }

  // Generate image with effects
  generateImageWithEffects(publicId, effects = []) {
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

    return cloudinary.url(publicId, {
      transformation: transformations
    });
  }

  // Add text overlay to image
  generateImageWithText(publicId, text, options = {}) {
    const {
      fontSize = 40,
      fontFamily = 'Arial',
      color = 'white',
      gravity = 'south',
      y = 20
    } = options;

    return cloudinary.url(publicId, {
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

  // Add watermark to image
  generateImageWithWatermark(publicId, watermarkPublicId, options = {}) {
    const {
      gravity = 'south_east',
      opacity = 50,
      width = 100,
      x = 10,
      y = 10
    } = options;

    return cloudinary.url(publicId, {
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

  // Convert image format
  generateConvertedImage(publicId, targetFormat = 'webp', quality = 'auto') {
    return cloudinary.url(publicId, {
      transformation: [
        { quality: quality, fetch_format: targetFormat }
      ]
    });
  }

  // Upload from base64 string
  async uploadBase64(base64String, folder = 'images', preset = 'medium') {
    try {
      const transformations = this.getTransformationPresets()[preset];
      const options = this.getUploadOptions(folder, transformations);

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

  // Upload from URL
  async uploadFromUrl(imageUrl, folder = 'images', preset = 'medium') {
    try {
      const result = await this.uploadImage(
        { path: imageUrl },
        folder,
        preset
      );
      return result;
    } catch (error) {
      throw new Error(`Failed to upload from URL: ${error.message}`);
    }
  }

  // Search images by tag
  async searchByTag(tag) {
    try {
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

  // Get storage usage stats
  async getUsageStats() {
    try {
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
}

module.exports = new CloudinaryConfig();