const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');

class AuthController {
  // Login user
  login = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(email, password, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Register new user
  register = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully'
    });
  });

  // Refresh access token
  refreshToken = catchAsync(async (req, res) => {
    const { user } = req;
    const result = await authService.refreshToken(user.id);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Change password
  changePassword = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { currentPassword, newPassword } = req.body;
    const { user } = req;

    const result = await authService.changePassword(user.id, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Forgot password
  forgotPassword = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Reset password
  resetPassword = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Verify email
  verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Resend email verification
  resendEmailVerification = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email } = req.body;
    const result = await authService.resendEmailVerification(email);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Get user profile
  getProfile = catchAsync(async (req, res) => {
    const { user } = req;
    const profile = await authService.getProfile(user.id);

    res.status(200).json({
      success: true,
      data: profile
    });
  });

  // Update user profile
  updateProfile = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { user } = req;
    const updatedUser = await authService.updateProfile(user.id, req.body);

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  });

  // Logout user
  logout = catchAsync(async (req, res) => {
    const { user } = req;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    const result = await authService.logout(user.id, token);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Get current user (from token)
  me = catchAsync(async (req, res) => {
    const { user } = req;

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  });
}

module.exports = new AuthController();