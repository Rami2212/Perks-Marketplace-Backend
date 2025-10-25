const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');
const mongoose = require('mongoose');

class ValidationMiddleware {
  // Handle validation results
  handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', formattedErrors));
    }

    next();
  };

  // Common validation rules
  mongoId = (field = 'id') => {
    return param(field)
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(`Invalid ${field}`);
        }
        return true;
      });
  };

  email = (field = 'email') => {
    return body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required');
  };

  password = (field = 'password', options = {}) => {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true
    } = options;

    let validator = body(field).isLength({ min: minLength });

    if (requireUppercase || requireLowercase || requireNumbers || requireSpecialChars) {
      const pattern = this.buildPasswordPattern({
        requireUppercase,
        requireLowercase,
        requireNumbers,
        requireSpecialChars
      });
      
      validator = validator.matches(pattern);
    }

    return validator.withMessage(
      `Password must be at least ${minLength} characters long and contain ` +
      `${requireUppercase ? 'uppercase, ' : ''}` +
      `${requireLowercase ? 'lowercase, ' : ''}` +
      `${requireNumbers ? 'numbers, ' : ''}` +
      `${requireSpecialChars ? 'special characters' : ''}`
    );
  };

  slug = (field = 'slug') => {
    return body(field)
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Slug must be lowercase letters, numbers and hyphens only');
  };

  url = (field, optional = false) => {
    const validator = optional ? body(field).optional() : body(field);
    return validator.isURL().withMessage('Valid URL is required');
  };

  // Pagination validation
  pagination = () => {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ];
  };

  // Date validation
  dateRange = () => {
    return [
      query('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format for dateFrom'),
      query('dateTo')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format for dateTo')
        .custom((dateTo, { req }) => {
          if (req.query.dateFrom && new Date(dateTo) < new Date(req.query.dateFrom)) {
            throw new Error('dateTo must be after dateFrom');
          }
          return true;
        })
    ];
  };

  // File validation
  fileUpload = (required = true) => {
    return (req, res, next) => {
      if (required && (!req.files || req.files.length === 0)) {
        return next(new AppError('File upload is required', 400, 'FILE_REQUIRED'));
      }

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (!this.isValidImageType(file.mimetype)) {
            return next(new AppError(`Invalid file type: ${file.mimetype}`, 400, 'INVALID_FILE_TYPE'));
          }

          if (file.size > 5 * 1024 * 1024) { // 5MB
            return next(new AppError('File size too large (max 5MB)', 400, 'FILE_TOO_LARGE'));
          }
        }
      }

      next();
    };
  };

  // Specific validation schemas
  perkValidation = {
    create: [
      body('title')
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Title is required and must be less than 200 characters'),
      body('shortDescription')
        .notEmpty()
        .isLength({ max: 300 })
        .withMessage('Short description is required and must be less than 300 characters'),
      body('vendor.name')
        .notEmpty()
        .withMessage('Vendor name is required'),
      body('location')
        .isIn(['Malaysia', 'Singapore', 'Global'])
        .withMessage('Invalid location'),
      body('redemptionMethod')
        .isIn(['affiliate_link', 'coupon_code', 'form_submission'])
        .withMessage('Invalid redemption method'),
      body('categoryId')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Valid category ID is required');
          }
          return true;
        }),
      body('subcategoryId')
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid subcategory ID');
          }
          return true;
        }),
      body('affiliateUrl')
        .if(body('redemptionMethod').equals('affiliate_link'))
        .isURL()
        .withMessage('Valid affiliate URL is required for affiliate redemption'),
      body('couponCode')
        .if(body('redemptionMethod').equals('coupon_code'))
        .notEmpty()
        .withMessage('Coupon code is required for coupon redemption')
    ],

    update: [
      body('title')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Title must be less than 200 characters'),
      body('location')
        .optional()
        .isIn(['Malaysia', 'Singapore', 'Global'])
        .withMessage('Invalid location'),
      body('status')
        .optional()
        .isIn(['active', 'inactive', 'draft'])
        .withMessage('Invalid status')
    ]
  };

  leadValidation = {
    submit: [
      body('name')
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Name is required and must be less than 100 characters'),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number required'),
      body('perkId')
        .custom((value) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Valid perk ID is required');
          }
          return true;
        })
    ]
  };

  categoryValidation = {
    create: [
      body('name')
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Category name is required and must be less than 100 characters'),
      body('slug')
        .optional()
        .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .withMessage('Slug must be lowercase letters, numbers and hyphens only'),
      body('parentId')
        .optional()
        .custom((value) => {
          if (value && !mongoose.Types.ObjectId.isValid(value)) {
            throw new Error('Invalid parent category ID');
          }
          return true;
        })
    ]
  };

  blogValidation = {
    create: [
      body('title')
        .notEmpty()
        .isLength({ max: 200 })
        .withMessage('Title is required and must be less than 200 characters'),
      body('content')
        .notEmpty()
        .withMessage('Content is required'),
      body('excerpt')
        .optional()
        .isLength({ max: 300 })
        .withMessage('Excerpt must be less than 300 characters'),
      body('author.name')
        .notEmpty()
        .withMessage('Author name is required'),
      body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
    ]
  };

  // Helper methods
  buildPasswordPattern(options) {
    let pattern = '^';
    
    if (options.requireUppercase) pattern += '(?=.*[A-Z])';
    if (options.requireLowercase) pattern += '(?=.*[a-z])';
    if (options.requireNumbers) pattern += '(?=.*\\d)';
    if (options.requireSpecialChars) pattern += '(?=.*[@$!%*?&])';
    
    pattern += '[A-Za-z\\d@$!%*?&]';
    
    return new RegExp(pattern);
  }

  isValidImageType(mimetype) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    return allowedTypes.includes(mimetype);
  }

  // Custom validators
  customValidators = {
    isStrongPassword: (value) => {
      const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return pattern.test(value);
    },

    isValidSlug: (value) => {
      const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return pattern.test(value);
    },

    isValidHexColor: (value) => {
      const pattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      return pattern.test(value);
    },

    isValidLocation: (value) => {
      const validLocations = ['Malaysia', 'Singapore', 'Global'];
      return validLocations.includes(value);
    }
  };
}

module.exports = new ValidationMiddleware();