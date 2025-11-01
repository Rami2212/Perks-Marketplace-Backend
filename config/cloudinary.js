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
      transformation: transformation,
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

      // Upload from buffer or file path
      const result = await cloudinary.uploader.upload(file.path || file.buffer, {
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
      return result;
    } catch (error) {
      console.error('Cloudinary multiple delete error:', error);
      throw new Error(`Failed to delete images from Cloudinary: ${error.message}`);
    }
  }

  // Get image details
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
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
}

module.exports = new CloudinaryConfig();