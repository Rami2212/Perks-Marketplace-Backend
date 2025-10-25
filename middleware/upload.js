const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // For image processing
const uploadConfig = require('../config/upload');
const { AppError } = require('./errorHandler');

class UploadMiddleware {
  constructor() {
    this.upload = uploadConfig.getMulterConfig();
  }

  // Single file upload
  uploadSingle = (fieldName = 'file', destination = 'images') => {
    const upload = uploadConfig.getMulterConfig(destination);
    
    return (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        if (req.file) {
          req.file.url = this.generateFileUrl(req.file, destination);
        }

        next();
      });
    };
  };

  // Multiple files upload
  uploadMultiple = (fieldName = 'files', maxCount = 5, destination = 'images') => {
    const upload = uploadConfig.getMulterConfig(destination);
    
    return (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        if (req.files && req.files.length > 0) {
          req.files = req.files.map(file => ({
            ...file,
            url: this.generateFileUrl(file, destination)
          }));
        }

        next();
      });
    };
  };

  // Fields upload (different field names)
  uploadFields = (fields, destination = 'images') => {
    const upload = uploadConfig.getMulterConfig(destination);
    
    return (req, res, next) => {
      upload.fields(fields)(req, res, (err) => {
        if (err) {
          return next(this.handleUploadError(err));
        }

        // Process each field
        if (req.files) {
          Object.keys(req.files).forEach(fieldName => {
            req.files[fieldName] = req.files[fieldName].map(file => ({
              ...file,
              url: this.generateFileUrl(file, destination)
            }));
          });
        }

        next();
      });
    };
  };

  // Image upload with processing
  uploadImages = (req, res, next) => {
    const upload = uploadConfig.getMulterConfig('images');
    
    upload.array('files', 5)(req, res, async (err) => {
      if (err) {
        return next(this.handleUploadError(err));
      }

      try {
        if (req.files && req.files.length > 0) {
          const processedFiles = await Promise.all(
            req.files.map(file => this.processImage(file))
          );
          
          req.files = processedFiles;
        }

        next();
      } catch (error) {
        next(new AppError('Image processing failed', 500, 'IMAGE_PROCESSING_ERROR'));
      }
    });
  };

  // Perk-specific uploads (logo + banner)
  uploadPerkImages = (req, res, next) => {
    const upload = uploadConfig.getMulterConfig('images');
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

        if (req.files.logo && req.files.logo[0]) {
          result.logo = await this.processImage(req.files.logo[0], 'logo');
        }

        if (req.files.banner && req.files.banner[0]) {
          result.banner = await this.processImage(req.files.banner[0], 'banner');
        }

        req.uploadedFiles = result;
        next();
      } catch (error) {
        next(new AppError('Image processing failed', 500, 'IMAGE_PROCESSING_ERROR'));
      }
    });
  };

  // Blog image upload
  uploadBlogImages = (req, res, next) => {
    const upload = uploadConfig.getMulterConfig('blog');
    
    upload.array('images', 10)(req, res, async (err) => {
      if (err) {
        return next(this.handleUploadError(err));
      }

      try {
        if (req.files && req.files.length > 0) {
          const processedFiles = await Promise.all(
            req.files.map(file => this.processImage(file, 'medium'))
          );
          
          req.files = processedFiles;
        }

        next();
      } catch (error) {
        next(new AppError('Image processing failed', 500, 'IMAGE_PROCESSING_ERROR'));
      }
    });
  };

  // Process and resize images
  async processImage(file, type = 'medium') {
    try {
      const config = uploadConfig.getImageProcessingConfig();
      const settings = config[type] || config.medium;

      // Generate processed filename
      const ext = path.extname(file.filename);
      const nameWithoutExt = path.basename(file.filename, ext);
      const processedFilename = `${nameWithoutExt}-processed${ext}`;
      const processedPath = path.join(path.dirname(file.path), processedFilename);

      // Process image with Sharp
      await sharp(file.path)
        .resize(settings.width, settings.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: settings.quality })
        .toFile(processedPath);

      // Get file stats
      const stats = fs.statSync(processedPath);

      // Remove original file
      fs.unlinkSync(file.path);

      return {
        ...file,
        filename: processedFilename,
        path: processedPath,
        size: stats.size,
        url: this.generateFileUrl({ ...file, filename: processedFilename }, 'images'),
        processed: true,
        dimensions: {
          width: settings.width,
          height: settings.height
        }
      };
    } catch (error) {
      console.error('Image processing error:', error);
      // Return original file if processing fails
      return {
        ...file,
        url: this.generateFileUrl(file, 'images'),
        processed: false
      };
    }
  }

  // Generate file URL
  generateFileUrl(file, destination) {
    const cdnConfig = uploadConfig.getCDNConfig();
    return `${cdnConfig.baseUrl}/uploads/${destination}/${file.filename}`;
  }

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

  // File cleanup middleware
  cleanupFiles = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Clean up uploaded files on response
      if (req.files) {
        const filesToCleanup = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        
        filesToCleanup.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      originalSend.call(this, data);
    };

    next();
  };

  // Validate file types
  validateFileTypes = (allowedTypes = []) => {
    return (req, res, next) => {
      const filesToCheck = req.files 
        ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
        : (req.file ? [req.file] : []);

      for (const file of filesToCheck) {
        if (!allowedTypes.includes(file.mimetype)) {
          return next(new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE'));
        }
      }

      next();
    };
  };
}

module.exports = new UploadMiddleware();