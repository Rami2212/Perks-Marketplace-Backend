const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

class AuthRepository {
  // Find user by email
  async findByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase() });
    } catch (error) {
      throw new AppError('Database error while finding user', 500, 'DATABASE_ERROR');
    }
  }

  // Find user by email with password
  async findByEmailWithPassword(email) {
    try {
      return await User.findByEmailWithPassword(email.toLowerCase());
    } catch (error) {
      throw new AppError('Database error while finding user', 500, 'DATABASE_ERROR');
    }
  }

  // Find user by ID
  async findById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      throw new AppError('Database error while finding user', 500, 'DATABASE_ERROR');
    }
  }

  // Find user by ID with password
  async findByIdWithPassword(id) {
    try {
      return await User.findById(id).select('+password');
    } catch (error) {
      throw new AppError('Database error while finding user', 500, 'DATABASE_ERROR');
    }
  }

  // Create new user
  async create(userData) {
    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while creating user', 500, 'DATABASE_ERROR');
    }
  }

  // Update user
  async update(id, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        id, 
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }
      throw new AppError('Database error while updating user', 500, 'DATABASE_ERROR');
    }
  }

  // Update last login
  async updateLastLogin(userId) {
    try {
      return await User.findByIdAndUpdate(userId, {
        lastLogin: new Date(),
        lastActive: new Date(),
        $unset: { loginAttempts: 1, lockUntil: 1 }
      });
    } catch (error) {
      throw new AppError('Database error while updating last login', 500, 'DATABASE_ERROR');
    }
  }

  // Update password
  async updatePassword(userId, hashedPassword) {
    try {
      return await User.findByIdAndUpdate(userId, {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
        $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
      });
    } catch (error) {
      throw new AppError('Database error while updating password', 500, 'DATABASE_ERROR');
    }
  }

  // Increment login attempts
  async incrementLoginAttempts(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      return await user.incLoginAttempts();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while incrementing login attempts', 500, 'DATABASE_ERROR');
    }
  }

  // Reset login attempts
  async resetLoginAttempts(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      return await user.resetLoginAttempts();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while resetting login attempts', 500, 'DATABASE_ERROR');
    }
  }

  // Set password reset token
  async setPasswordResetToken(userId, token, expires) {
    try {
      return await User.findByIdAndUpdate(userId, {
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date()
      });
    } catch (error) {
      throw new AppError('Database error while setting password reset token', 500, 'DATABASE_ERROR');
    }
  }

  // Find user by password reset token
  async findByPasswordResetToken(token) {
    try {
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      return await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+passwordResetToken +passwordResetExpires');
    } catch (error) {
      throw new AppError('Database error while finding user by reset token', 500, 'DATABASE_ERROR');
    }
  }

  // Set email verification token
  async setEmailVerificationToken(userId, token, expires) {
    try {
      return await User.findByIdAndUpdate(userId, {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        updatedAt: new Date()
      });
    } catch (error) {
      throw new AppError('Database error while setting email verification token', 500, 'DATABASE_ERROR');
    }
  }

  // Find user by email verification token
  async findByEmailVerificationToken(token) {
    try {
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      return await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
      }).select('+emailVerificationToken +emailVerificationExpires');
    } catch (error) {
      throw new AppError('Database error while finding user by verification token', 500, 'DATABASE_ERROR');
    }
  }

  // Verify email
  async verifyEmail(userId) {
    try {
      return await User.findByIdAndUpdate(userId, {
        emailVerified: true,
        updatedAt: new Date(),
        $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 }
      });
    } catch (error) {
      throw new AppError('Database error while verifying email', 500, 'DATABASE_ERROR');
    }
  }

  // Get all users with pagination
  async findAll(page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      // Apply filters
      if (filters.role) query.role = filters.role;
      if (filters.status) query.status = filters.status;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      return { users, total };
    } catch (error) {
      throw new AppError('Database error while fetching users', 500, 'DATABASE_ERROR');
    }
  }

  // Delete user
  async delete(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting user', 500, 'DATABASE_ERROR');
    }
  }

  // Update user status
  async updateStatus(userId, status) {
    try {
      return await this.update(userId, { status });
    } catch (error) {
      throw error;
    }
  }

  // Get user stats
  async getUserStats() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            suspended: {
              $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
            },
            superAdmins: {
              $sum: { $cond: [{ $eq: ['$role', 'super_admin'] }, 1, 0] }
            },
            contentEditors: {
              $sum: { $cond: [{ $eq: ['$role', 'content_editor'] }, 1, 0] }
            },
            verifiedEmails: {
              $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        superAdmins: 0,
        contentEditors: 0,
        verifiedEmails: 0
      };
    } catch (error) {
      throw new AppError('Database error while getting user stats', 500, 'DATABASE_ERROR');
    }
  }

  // Clean up unverified users
  async cleanupUnverifiedUsers() {
    try {
      return await User.cleanupUnverifiedUsers();
    } catch (error) {
      throw new AppError('Database error while cleaning up unverified users', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new AuthRepository();