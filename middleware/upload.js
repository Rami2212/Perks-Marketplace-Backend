// middleware/upload.js
const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed', 400, 'INVALID_FILE_TYPE'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Export upload configurations
module.exports = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files upload (same field name)
  multiple: (fieldName, maxCount = 10) => upload.array(fieldName, maxCount),
  
  // Multiple files with different field names
  fields: (fields) => upload.fields(fields),
  
  // Any files
  any: () => upload.any(),
  
  // Error handler for multer errors
  handleMulterError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size too large. Maximum size is 5MB', 400, 'FILE_TOO_LARGE'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new AppError('Too many files uploaded', 400, 'TOO_MANY_FILES'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE'));
      }
      return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
    }
    next(err);
  }
};