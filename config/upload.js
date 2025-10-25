const multer = require('multer');
const path = require('path');
const fs = require('fs');

class UploadConfig {
  constructor() {
    this.maxFileSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024; // 5MB
    this.allowedTypes = process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    this.uploadDir = process.env.UPLOAD_DESTINATION || './uploads';
    this.ensureUploadDirectories();
  }

  ensureUploadDirectories() {
    const directories = [
      `${this.uploadDir}/images`,
      `${this.uploadDir}/logos`,
      `${this.uploadDir}/banners`,
      `${this.uploadDir}/blog`,
      `${this.uploadDir}/temp`,
      `${this.uploadDir}/exports`
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  getMulterConfig(destination = 'images') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, destination);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 5 // Maximum 5 files per upload
      }
    });
  }

  // Image processing configuration
  getImageProcessingConfig() {
    return {
      thumbnail: { width: 150, height: 150, quality: 80 },
      medium: { width: 500, height: 500, quality: 85 },
      large: { width: 1200, height: 1200, quality: 90 },
      banner: { width: 1920, height: 600, quality: 90 },
      logo: { width: 200, height: 200, quality: 95 }
    };
  }

  // CDN configuration
  getCDNConfig() {
    return {
      baseUrl: process.env.CDN_URL || `http://localhost:${process.env.PORT || 3000}`,
      imagePath: '/uploads/images',
      maxAge: 31536000 // 1 year cache
    };
  }

  // File validation
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return errors;
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    if (file.size > this.maxFileSize) {
      errors.push(`File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}`);
    }

    return errors;
  }
}

module.exports = new UploadConfig();