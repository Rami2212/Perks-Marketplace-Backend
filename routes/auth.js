const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const uploadMiddleware = require('../middleware/upload');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const registerValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('role')
    .optional()
    .isIn(['super_admin', 'content_editor'])
    .withMessage('Invalid role')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character')
];

const resendVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme preference'),
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Invalid language preference')
];

// Public routes (no authentication required)
router.post('/login', 
  rateLimitMiddleware.authLimiter, 
  loginValidation, 
  authController.login
);

router.post('/register', 
  rateLimitMiddleware.authLimiter, 
  registerValidation, 
  authController.register
);

router.post('/forgot-password', 
  rateLimitMiddleware.authLimiter, 
  forgotPasswordValidation, 
  authController.forgotPassword
);

router.post('/reset-password', 
  rateLimitMiddleware.authLimiter, 
  resetPasswordValidation, 
  authController.resetPassword
);

router.get('/verify-email/:token', 
  param('token').isLength({ min: 1 }).withMessage('Verification token is required'),
  authController.verifyEmail
);

router.post('/resend-verification', 
  rateLimitMiddleware.authLimiter, 
  resendVerificationValidation, 
  authController.resendEmailVerification
);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

router.post('/refresh-token', authController.refreshToken);

router.post('/logout', authController.logout);

router.get('/me', authController.me);

router.get('/profile', authController.getProfile);

router.put('/profile', 
  updateProfileValidation, 
  authController.updateProfile
);

router.put('/change-password', 
  changePasswordValidation, 
  authController.changePassword
);

// Avatar upload route
// router.post('/upload-avatar',
//   uploadMiddleware.uploadSingle('avatar', 'avatars'),
//   authController.uploadAvatar
// );

module.exports = router;