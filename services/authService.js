const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authRepository = require('../repositories/authRepository');
const jwtUtils = require('../utils/jwt');
const passwordUtils = require('../utils/password');
const emailService = require('./emailService');
const { AppError } = require('../middleware/errorHandler');
const { USER_STATUSES, SECURITY } = require('../utils/constants');

class AuthService {
  // User login
  async login(email, password, ipAddress, userAgent) {
    try {
      // Find user with password
      const user = await authRepository.findByEmailWithPassword(email);
      
      if (!user) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if account is locked
      if (user.isLocked) {
        throw new AppError('Account is temporarily locked due to too many failed login attempts', 423, 'ACCOUNT_LOCKED');
      }

      // Check if account is active
      if (user.status !== USER_STATUSES.ACTIVE) {
        throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        // Increment login attempts
        await authRepository.incrementLoginAttempts(user._id);
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Reset login attempts and update last login
      await authRepository.updateLastLogin(user._id);

      // Generate tokens
      const tokens = jwtUtils.generateTokens({
        id: user._id,
        email: user.email,
        role: user.role
      });

      // Return user data (password excluded by model transform)
      return {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          avatar: user.avatar,
          preferences: user.preferences,
          lastLogin: user.lastLogin
        },
        expiresIn: '24h'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 500, 'LOGIN_ERROR');
    }
  }

  // Refresh access token
  async refreshToken(userId) {
    try {
      const user = await authRepository.findById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.status !== USER_STATUSES.ACTIVE) {
        throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      }

      // Generate new access token
      const tokens = jwtUtils.generateTokens({
        id: user._id,
        email: user.email,
        role: user.role
      });

      return {
        token: tokens.accessToken,
        expiresIn: '24h'
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Token refresh failed', 500, 'TOKEN_REFRESH_ERROR');
    }
  }

  // Register new user
  async register(userData) {
    try {
      // Validate password strength
      const passwordValidation = passwordUtils.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD', passwordValidation.errors);
      }

      // Create user
      const user = await authRepository.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'user'
      });

      // Generate email verification token if email service is available
      if (emailService.isConfigured()) {
        const verificationToken = user.createEmailVerificationToken();
        await user.save();

        // Send verification email
        await emailService.sendEmailVerification(user.email, user.name, verificationToken);
      } else {
        // Auto-verify if email service is not configured
        user.emailVerified = true;
        await user.save();
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Find user with password
      const user = await authRepository.findByIdWithPassword(userId);
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      // Validate new password
      const passwordValidation = passwordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError('New password does not meet requirements', 400, 'WEAK_PASSWORD', passwordValidation.errors);
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
      }

      // Hash new password
      const hashedNewPassword = await passwordUtils.hashPassword(newPassword);

      // Update password
      await authRepository.updatePassword(userId, hashedNewPassword);

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Password change failed', 500, 'PASSWORD_CHANGE_ERROR');
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const user = await authRepository.findByEmail(email);
      
      if (!user) {
        // Don't reveal that email doesn't exist
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = user.createPasswordResetToken();
      await user.save();

      // Send reset email
      if (emailService.isConfigured()) {
        await emailService.sendPasswordReset(user.email, user.name, resetToken);
      }

      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    } catch (error) {
      throw new AppError('Password reset request failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      // Find user by reset token
      const user = await authRepository.findByPasswordResetToken(token);
      
      if (!user) {
        throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
      }

      // Validate new password
      const passwordValidation = passwordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD', passwordValidation.errors);
      }

      // Hash new password
      const hashedPassword = await passwordUtils.hashPassword(newPassword);

      // Update password and clear reset token
      await authRepository.updatePassword(user._id, hashedPassword);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Password reset failed', 500, 'PASSWORD_RESET_ERROR');
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      const user = await authRepository.findByEmailVerificationToken(token);
      
      if (!user) {
        throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      }

      // Verify email
      await authRepository.verifyEmail(user._id);

      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Email verification failed', 500, 'EMAIL_VERIFICATION_ERROR');
    }
  }

  // Resend email verification
  async resendEmailVerification(email) {
    try {
      const user = await authRepository.findByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.emailVerified) {
        throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Generate new verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save();

      // Send verification email
      if (emailService.isConfigured()) {
        await emailService.sendEmailVerification(user.email, user.name, verificationToken);
      }

      return { message: 'Verification email sent successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to resend verification email', 500, 'RESEND_VERIFICATION_ERROR');
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await authRepository.findById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get user profile', 500, 'GET_PROFILE_ERROR');
    }
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    try {
      // Remove sensitive fields that shouldn't be updated via this method
      const allowedFields = ['name', 'preferences', 'avatar'];
      const filteredData = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
      }

      const user = await authRepository.update(userId, filteredData);
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Profile update failed', 500, 'PROFILE_UPDATE_ERROR');
    }
  }

  // Validate token (for middleware)
  async validateToken(token) {
    try {
      const decoded = jwtUtils.verifyAccessToken(token);
      const user = await authRepository.findById(decoded.id);

      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      if (user.status !== USER_STATUSES.ACTIVE) {
        throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      }

      // Check if password was changed after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        throw new AppError('User recently changed password, please log in again', 401, 'PASSWORD_CHANGED');
      }

      return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || []
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Token validation failed', 401, 'TOKEN_VALIDATION_ERROR');
    }
  }

  // Logout (could implement token blacklisting here)
  async logout(userId, token) {
    try {
      // Update last active time
      await authRepository.update(userId, { lastActive: new Date() });
      
      // In a production app, you might want to blacklist the token
      // For now, we'll just return success
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
    }
  }
}

module.exports = new AuthService();