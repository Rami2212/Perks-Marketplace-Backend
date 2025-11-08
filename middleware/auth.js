const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const authRepository = require('../repositories/authRepository');
const { AppError } = require('./errorHandler');

class AuthMiddleware {
  constructor() {
    // Public paths that don’t require auth
    this.publicPaths = [
      '/health', 
      '/sitemap.xml', 
      '/robots.txt', 
      '/api/v1/auth/login', 
      '/api/v1/auth/register', 
      '/api/v1/auth/refresh-token', 
      '/api/v1/perks', 
      '/api/v1/categories'
    ];
  }
  // Main authentication middleware
  authenticate = async (req, res, next) => {
    try {
      if (this.publicPaths.includes(req.path)) {
        return next();
      }
      const token = this.extractToken(req);
      
      if (!token) {
        throw new AppError('Access token is required', 401, 'TOKEN_REQUIRED');
      }

      const decoded = authConfig.verifyAccessToken(token);
      const user = await authRepository.findById(decoded.id);

      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      if (user.status !== 'active') {
        throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        throw new AppError('Account is temporarily locked', 423, 'ACCOUNT_LOCKED');
      }

      req.user = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || []
      };

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
      }
      next(error);
    }
  };

  // Optional authentication - doesn't fail if no token
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = authConfig.verifyAccessToken(token);
        const user = await authRepository.findById(decoded.id);

        if (user && user.status === 'active') {
          req.user = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions || []
          };
        }
      }

      next();
    } catch (error) {
      // Ignore authentication errors for optional auth
      next();
    }
  };

  // Role-based authorization
  requireRole = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      if (!allowedRoles.includes(req.user.role)) {
        return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
      }

      next();
    };
  };

  // Permission-based authorization
  requirePermission = (requiredPermissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
      }

      next();
    };
  };

  // Resource ownership check
  requireOwnership = (resourceField = 'createdBy') => {
    return (req, res, next) => {
      if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      // Super admin can access everything
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Check if user owns the resource (implement in controller)
      req.checkOwnership = {
        userId: req.user.id,
        field: resourceField
      };

      next();
    };
  };

  // Admin only middleware
  adminOnly = (req, res, next) => {
    return this.requireRole(['super_admin', 'content_editor'])(req, res, next);
  };

  // Super admin only middleware
  superAdminOnly = (req, res, next) => {
    return this.requireRole(['super_admin'])(req, res, next);
  };

  // Extract token from request headers
  extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  // Refresh token middleware
  verifyRefreshToken = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
      }

      const decoded = authConfig.verifyRefreshToken(token);
      req.user = decoded;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED'));
      }
      next(error);
    }
  };
}

module.exports = new AuthMiddleware();