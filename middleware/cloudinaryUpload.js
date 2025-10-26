const multer = require('multer');
const { AppError } = require('./errorHandler');
const cloudinaryConfig = require('../config/cloudinary');
const fs = require('fs').promises;

class CloudinaryUploadMiddleware {
  constructor() {
    // Use memory storage instead of disk storage
    this.storage = multer.memoryStorage();
    
    this.maxFileSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024; // 5MB
    this.allowedTypes = process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
  }

  // File filter for validation
  fileFilter = (req, file, cb) => {
    if (this.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE'), false);
    }
  };

  // Get multer instance
  getMulterInstance(maxCount = 5) {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: maxCount
      }
    });
  }

  // Single file upload to Cloudinary
  uploadSingle = (fieldName = 'file', folder = 'images', preset = 'medium') => {
    const upload = this.getMulterInstance(1);
    
    return async (req, res, next) => {
      upload.single(fieldName)(req, res, async (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        if (!req.file) {
          return next();
        }

        try {
          // Create temporary file for Cloudinary upload
          const tempPath = `/tmp/${Date.now()}-${req.file.originalname}`;
          await fs.writeFile(tempPath, req.file.buffer);
          req.file.path = tempPath;

          // Upload to Cloudinary
          const result = await cloudinaryConfig.uploadImage(req.file, folder, preset);
          
          // Clean up temp file
          await fs.unlink(tempPath).catch(console.error);
          
          // Attach Cloudinary result to request
          req.cloudinaryFile = result;
          req.file.cloudinary = result;

          next();
        } catch (error) {
          console.error('Cloudinary upload error:', error);
          next(new AppError('Failed to upload image', 500, 'CLOUDINARY_UPLOAD_ERROR'));
        }
      });
    };
  };

  // Multiple files upload to Cloudinary
  uploadMultiple = (fieldName = 'files', maxCount = 5, folder = 'images', preset = 'medium') => {
    const upload = this.getMulterInstance(maxCount);
    
    return async (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        if (!req.files || req.files.length === 0) {
          return next();
        }

        try {
          // Create temporary files for all uploads
          const tempFiles = await Promise.all(
            req.files.map(async (file) => {
              const tempPath = `/tmp/${Date.now()}-${Math.random()}-${file.originalname}`;
              await fs.writeFile(tempPath, file.buffer);
              file.path = tempPath;
              return file;
            })
          );

          // Upload all files to Cloudinary
          const results = await cloudinaryConfig.uploadMultipleImages(tempFiles, folder, preset);
          
          // Clean up temp files
          await Promise.all(
            tempFiles.map(file => fs.unlink(file.path).catch(console.error))
          );
          
          // Attach Cloudinary results to request
          req.cloudinaryFiles = results;
          req.files = req.files.map((file, index) => ({
            ...file,
            cloudinary: results[index]
          }));

          next();
        } catch (error) {
          console.error('Cloudinary multiple upload error:', error);
          next(new AppError('Failed to upload images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
        }
      });
    };
  };

  // Upload fields (different field names)
  uploadFields = (fields, folder = 'images', preset = 'medium') => {
    const upload = this.getMulterInstance(10);
    
    return async (req, res, next) => {
      upload.fields(fields)(req, res, async (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        if (!req.files || Object.keys(req.files).length === 0) {
          return next();
        }

        try {
          const results = {};
          
          // Process each field
          for (const fieldName of Object.keys(req.files)) {
            const files = req.files[fieldName];
            
            // Create temporary files
            const tempFiles = await Promise.all(
              files.map(async (file) => {
                const tempPath = `/tmp/${Date.now()}-${Math.random()}-${file.originalname}`;
                await fs.writeFile(tempPath, file.buffer);
                file.path = tempPath;
                return file;
              })
            );

            // Upload to Cloudinary
            const uploadResults = await cloudinaryConfig.uploadMultipleImages(tempFiles, folder, preset);
            
            // Clean up temp files
            await Promise.all(
              tempFiles.map(file => fs.unlink(file.path).catch(console.error))
            );
            
            results[fieldName] = uploadResults;
            
            // Update files with Cloudinary data
            req.files[fieldName] = req.files[fieldName].map((file, index) => ({
              ...file,
              cloudinary: uploadResults[index]
            }));
          }

          req.cloudinaryFiles = results;
          next();
        } catch (error) {
          console.error('Cloudinary fields upload error:', error);
          next(new AppError('Failed to upload images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
        }
      });
    };
  };

  // Perk-specific uploads (logo + banner)
  uploadPerkImages = async (req, res, next) => {
    const upload = this.getMulterInstance(2);
    const fields = [
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 }
    ];
    
    upload.fields(fields)(req, res, async (err) => {
      if (err) {
        return next(this.handleUploadError(err));
      }

      try {
        const result = {};

        // Upload logo
        if (req.files?.logo && req.files.logo[0]) {
          const logoFile = req.files.logo[0];
          const tempPath = `/tmp/${Date.now()}-logo-${logoFile.originalname}`;
          await fs.writeFile(tempPath, logoFile.buffer);
          logoFile.path = tempPath;
          
          result.logo = await cloudinaryConfig.uploadImage(logoFile, 'logos', 'logo');
          await fs.unlink(tempPath).catch(console.error);
        }

        // Upload banner
        if (req.files?.banner && req.files.banner[0]) {
          const bannerFile = req.files.banner[0];
          const tempPath = `/tmp/${Date.now()}-banner-${bannerFile.originalname}`;
          await fs.writeFile(tempPath, bannerFile.buffer);
          bannerFile.path = tempPath;
          
          result.banner = await cloudinaryConfig.uploadImage(bannerFile, 'banners', 'banner');
          await fs.unlink(tempPath).catch(console.error);
        }

        req.uploadedFiles = result;
        next();
      } catch (error) {
        console.error('Perk images upload error:', error);
        next(new AppError('Failed to upload perk images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
      }
    });
  };

  // Blog image upload
  uploadBlogImages = async (req, res, next) => {
    const upload = this.getMulterInstance(10);
    
    upload.array('images', 10)(req, res, async (err) => {
      if (err) {
        return next(this.handleUploadError(err));
      }

      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        // Create temporary files
        const tempFiles = await Promise.all(
          req.files.map(async (file) => {
            const tempPath = `/tmp/${Date.now()}-${Math.random()}-${file.originalname}`;
            await fs.writeFile(tempPath, file.buffer);
            file.path = tempPath;
            return file;
          })
        );

        // Upload to Cloudinary
        const results = await cloudinaryConfig.uploadMultipleImages(tempFiles, 'blog', 'medium');
        
        // Clean up temp files
        await Promise.all(
          tempFiles.map(file => fs.unlink(file.path).catch(console.error))
        );
        
        req.cloudinaryFiles = results;
        req.files = req.files.map((file, index) => ({
          ...file,
          cloudinary: results[index]
        }));

        next();
      } catch (error) {
        console.error('Blog images upload error:', error);
        next(new AppError('Failed to upload blog images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
      }
    });
  };

  // Handle upload errors
  handleUploadError(err) {
    if (err instanceof multer.MulterError) {
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return new AppError('File size too large', 400, 'FILE_TOO_LARGE');
        case 'LIMIT_FILE_COUNT':
          return new AppError('Too many files', 400, 'TOO_MANY_FILES');
        case 'LIMIT_UNEXPECTED_FILE':
          return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
        default:
          return new AppError('Upload error', 400, 'UPLOAD_ERROR');
      }
    }

    if (err.message.includes('File type')) {
      return new AppError(err.message, 400, 'INVALID_FILE_TYPE');
    }

    return new AppError('Upload failed', 500, 'UPLOAD_FAILED');
  }

  // Delete image from Cloudinary (helper middleware)
  deleteImage = async (req, res, next) => {
    try {
      const { publicId } = req.body;
      
      if (!publicId) {
        return next(new AppError('Public ID is required', 400, 'MISSING_PUBLIC_ID'));
      }

      const result = await cloudinaryConfig.deleteImage(publicId);
      req.deleteResult = result;
      next();
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      next(new AppError('Failed to delete image', 500, 'CLOUDINARY_DELETE_ERROR'));
    }
  };
}

module.exports = new CloudinaryUploadMiddleware();