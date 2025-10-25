const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const config = require('../config').app;

class RateLimitMiddleware {
  constructor() {
    this.rateLimitConfig = config.getRateLimitConfig();
    
    // Use MongoDB store for production
    this.store = process.env.NODE_ENV === 'production' 
      ? new MongoStore({
          uri: process.env.MONGODB_URI,
          collectionName: 'rate_limits',
          expireTimeMs: 15 * 60 * 1000 // 15 minutes
        })
      : undefined; // Use memory store for development
  }

  // Global rate limiter
  globalLimiter = rateLimit({
    windowMs: this.rateLimitConfig.global.windowMs,
    max: this.rateLimitConfig.global.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: this.rateLimitConfig.global.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: this.store,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });

  // Authentication rate limiter (stricter)
  authLimiter = rateLimit({
    windowMs: this.rateLimitConfig.auth.windowMs,
    max: this.rateLimitConfig.auth.max,
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: this.rateLimitConfig.auth.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: this.store,
    skipSuccessfulRequests: true // Don't count successful auth attempts
  });

  // Upload rate limiter
  uploadLimiter = rateLimit({
    windowMs: this.rateLimitConfig.upload.windowMs,
    max: this.rateLimitConfig.upload.max,
    message: {
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: this.rateLimitConfig.upload.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: this.store
  });

  // API endpoint specific limiters
  createLimiter = (options) => {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000,
      max: options.max || 100,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: this.store,
      ...options
    });
  };

  // Lead submission rate limiter
  leadSubmissionLimiter = this.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 submissions per minute
    message: 'Too many lead submissions, please try again later'
  });

  // Partner submission rate limiter
  partnerSubmissionLimiter = this.createLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 submissions per hour
    message: 'Too many partner applications, please try again later'
  });

  // Search rate limiter
  searchLimiter = this.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please try again later'
  });

  // Analytics rate limiter (for public analytics endpoints)
  analyticsLimiter = this.createLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many analytics requests, please try again later'
  });

  // Export rate limiter
  exportLimiter = this.createLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 exports per hour
    message: 'Too many export requests, please try again later'
  });

  // IP-based limiter with different limits for different user types
  createUserTypeLimiter = (limits) => {
    return (req, res, next) => {
      const user = req.user;
      let limit = limits.anonymous || 10;

      if (user) {
        if (user.role === 'super_admin') {
          limit = limits.superAdmin || 1000;
        } else if (user.role === 'content_editor') {
          limit = limits.contentEditor || 500;
        } else {
          limit = limits.authenticated || 100;
        }
      }

      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: limit,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: this.store,
        keyGenerator: (req) => {
          return user ? `user_${user.id}` : req.ip;
        }
      });

      limiter(req, res, next);
    };
  };

  // Dynamic rate limiter based on endpoint and user
  dynamicLimiter = this.createUserTypeLimiter({
    anonymous: 50,
    authenticated: 200,
    contentEditor: 500,
    superAdmin: 1000
  });

  // Burst limiter for handling sudden spikes
  burstLimiter = this.createLimiter({
    windowMs: 1000, // 1 second
    max: 5, // 5 requests per second
    message: 'Too many requests in a short time, please slow down'
  });

  // Custom limiter for specific endpoints
  customEndpointLimiter = (endpoint, options = {}) => {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: `Too many requests to ${endpoint}, please try again later`
    };

    return this.createLimiter({ ...defaultOptions, ...options });
  };
}

module.exports = new RateLimitMiddleware();