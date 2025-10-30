// middleware/cloudinaryUpload.js
const multer = require('multer');
const { AppError } = require('./errorHandler');
const cloudinaryConfig = require('../config/cloudinary');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

class CloudinaryUploadMiddleware {
  constructor() {
    this.storage = multer.memoryStorage();
    
    this.maxFileSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024; // 5MB
    this.allowedTypes = process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    this.tempSubdir = 'perks-marketplace';
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

  // Helper: ensure temp directory exists
  async ensureTempDir() {
    const baseTemp = os.tmpdir();
    const tempDir = path.join(baseTemp, this.tempSubdir);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  // Helper: create safe temp path for a file
  async createTempFilePath(originalName) {
    const tempDir = await this.ensureTempDir();
    const safeName = path.basename(originalName || 'upload');
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    return path.join(tempDir, fileName);
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

        let tempPath;
        try {
          tempPath = await this.createTempFilePath(req.file.originalname);
          await fs.writeFile(tempPath, req.file.buffer);
          req.file.path = tempPath;

          const result = await cloudinaryConfig.uploadImage(req.file, folder, preset);
          
          req.cloudinaryFile = result;
          req.file.cloudinary = result;

          next();
        } catch (error) {
          console.error('Cloudinary upload error:', error);
          next(new AppError('Failed to upload image', 500, 'CLOUDINARY_UPLOAD_ERROR'));
        } finally {
          if (tempPath) {
            fs.unlink(tempPath).catch(() => {});
          }
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

        const tempFiles = [];
        try {
          for (const file of req.files) {
            const tempPath = await this.createTempFilePath(file.originalname);
            await fs.writeFile(tempPath, file.buffer);
            file.path = tempPath;
            tempFiles.push(file);
          }

          const results = await cloudinaryConfig.uploadMultipleImages(tempFiles, folder, preset);
          
          req.cloudinaryFiles = results;
          req.files = req.files.map((file, index) => ({
            ...file,
            cloudinary: results[index]
          }));

          next();
        } catch (error) {
          console.error('Cloudinary multiple upload error:', error);
          next(new AppError('Failed to upload images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
        } finally {
          await Promise.all(tempFiles.map(f => fs.unlink(f.path).catch(() => {})));
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

        const allTempFiles = [];
        try {
          const results = {};
          
          for (const fieldName of Object.keys(req.files)) {
            const files = req.files[fieldName];
            
            const tempFiles = [];
            for (const file of files) {
              const tempPath = await this.createTempFilePath(file.originalname);
              await fs.writeFile(tempPath, file.buffer);
              file.path = tempPath;
              tempFiles.push(file);
              allTempFiles.push(file);
            }

            const uploadResults = await cloudinaryConfig.uploadMultipleImages(tempFiles, folder, preset);
            
            results[fieldName] = uploadResults;
            
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
        } finally {
          await Promise.all(allTempFiles.map(f => fs.unlink(f.path).catch(() => {})));
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

      let logoTemp, bannerTemp;
      try {
        const result = {};

        if (req.files?.logo && req.files.logo[0]) {
          const logoFile = req.files.logo[0];
          logoTemp = await this.createTempFilePath(logoFile.originalname);
          await fs.writeFile(logoTemp, logoFile.buffer);
          logoFile.path = logoTemp;
          
          result.logo = await cloudinaryConfig.uploadImage(logoFile, 'logos', 'logo');
        }

        if (req.files?.banner && req.files.banner[0]) {
          const bannerFile = req.files.banner[0];
          bannerTemp = await this.createTempFilePath(bannerFile.originalname);
          await fs.writeFile(bannerTemp, bannerFile.buffer);
          bannerFile.path = bannerTemp;
          
          result.banner = await cloudinaryConfig.uploadImage(bannerFile, 'banners', 'banner');
        }

        req.uploadedFiles = result;
        next();
      } catch (error) {
        console.error('Perk images upload error:', error);
        next(new AppError('Failed to upload perk images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
      } finally {
        if (logoTemp) await fs.unlink(logoTemp).catch(() => {});
        if (bannerTemp) await fs.unlink(bannerTemp).catch(() => {});
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

      const tempFiles = [];
      try {
        for (const file of req.files) {
          const tempPath = await this.createTempFilePath(file.originalname);
          await fs.writeFile(tempPath, file.buffer);
          file.path = tempPath;
          tempFiles.push(file);
        }

        const results = await cloudinaryConfig.uploadMultipleImages(tempFiles, 'blog', 'medium');
        
        req.cloudinaryFiles = results;
        req.files = req.files.map((file, index) => ({
          ...file,
          cloudinary: results[index]
        }));

        next();
      } catch (error) {
        console.error('Blog images upload error:', error);
        next(new AppError('Failed to upload blog images', 500, 'CLOUDINARY_UPLOAD_ERROR'));
      } finally {
        await Promise.all(tempFiles.map(f => fs.unlink(f.path).catch(() => {})));
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

    if (err.message?.includes('File type')) {
      return new AppError(err.message, 400, 'INVALID_FILE_TYPE');
    }

    return new AppError('Upload failed', 500, 'UPLOAD_FAILED');
  }
}

module.exports = new CloudinaryUploadMiddleware();