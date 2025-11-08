const cors = require('cors');

class CorsMiddleware {
  constructor() {
    // Environment-based configuration
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    
    // Trusted origins configuration
    this.trustedOrigins = this.getTrustedOrigins();
    this.adminOrigins = this.getAdminOrigins();
    this.webhookOrigins = this.getWebhookOrigins();
    
    // Common headers
    this.commonHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent',
      'Cache-Control'
    ];
    
    this.analyticsHeaders = [
      'GA-Client-ID',
      'GA-Source',
      'X-Client-ID'
    ];
    
    this.exposedHeaders = [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Total-Count',
      'Content-Range'
    ];
  }

  // Get trusted origins based on environment
  getTrustedOrigins() {
    const origins = [];
    
    // Production origins
    if (process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
    }
    if (process.env.ADMIN_URL) {
      origins.push(process.env.ADMIN_URL);
    }
    if (process.env.CLIENT_URL) {
      origins.push(process.env.CLIENT_URL);
    }
    
    // Development origins
    if (this.isDevelopment || this.isTest) {
      origins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080'
      );
    }
    
    return origins.filter(Boolean);
  }

  // Get admin-specific origins
  getAdminOrigins() {
    const origins = [];
    
    if (process.env.ADMIN_URL) {
      origins.push(process.env.ADMIN_URL);
    }
    
    // Development admin origins
    if (this.isDevelopment || this.isTest) {
      origins.push(
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      );
    }
    
    return origins.filter(Boolean);
  }

  // Get webhook-specific origins
  getWebhookOrigins() {
    return [
      'https://api.stripe.com',
      'https://hooks.zapier.com',
      'https://api.mailchimp.com',
      'https://api.github.com',
      'https://hooks.slack.com'
    ];
  }

  // UPDATED: Origin validator function with Vercel support
  originValidator = (allowedOrigins) => {
    return (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Development mode - allow all localhost origins
      if (this.isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      // Allow Vercel preview deployments (for testing)
      if (origin.includes('vercel.app')) {
        // Only allow if it matches your project name
        if (origin.includes('perks-marketplace-frontend')) {
          return callback(null, true);
        }
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origin for debugging
      console.warn(`CORS: Origin ${origin} not allowed`);
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    };
  };

  // Security headers middleware
  securityHeaders = (req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Production security
    if (this.isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  };

  // Main CORS configuration
  get mainCors() {
    return cors({
      origin: this.isDevelopment ? true : this.originValidator(this.trustedOrigins),
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        ...this.commonHeaders,
        ...this.analyticsHeaders
      ],
      exposedHeaders: this.exposedHeaders,
      preflightContinue: false,
      maxAge: this.isProduction ? 86400 : 0 // 24 hours cache in production
    });
  }

  // File upload CORS
  get uploadCors() {
    return cors({
      origin: this.isDevelopment ? true : this.originValidator(this.trustedOrigins),
      credentials: true,
      methods: ['POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        ...this.commonHeaders,
        'Content-Length'
      ],
      exposedHeaders: this.exposedHeaders,
      maxAge: this.isProduction ? 86400 : 0
    });
  }

  // Admin CORS (more restrictive)
  get adminCors() {
    return cors({
      origin: this.isDevelopment ? true : this.originValidator(this.adminOrigins),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        ...this.commonHeaders,
        'X-Admin-Token',
        'X-Admin-Key'
      ],
      exposedHeaders: this.exposedHeaders,
      maxAge: 0 // No caching for admin routes
    });
  }

  // Public API CORS (read-only operations)
  get publicCors() {
    return cors({
      origin: true, // Allow all origins for public data
      credentials: false,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Origin',
        'User-Agent',
        'X-Requested-With',
        ...this.analyticsHeaders
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'Content-Range'
      ],
      maxAge: this.isProduction ? 3600 : 0 // 1 hour cache for public routes
    });
  }

  // Webhook CORS (external services)
  get webhookCors() {
    return cors({
      origin: this.originValidator(this.webhookOrigins),
      credentials: false,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'User-Agent',
        'X-Webhook-Signature',
        'X-Hub-Signature',
        'X-Hub-Signature-256',
        'X-Stripe-Signature'
      ],
      maxAge: 0 // No caching for webhooks
    });
  }

  // Development CORS (very permissive)
  get developmentCors() {
    if (!this.isDevelopment) {
      console.warn('Development CORS should only be used in development environment');
    }
    
    return cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: '*',
      exposedHeaders: '*',
      maxAge: 0
    });
  }

  // Dynamic CORS for specific routes
  dynamicCors = (allowedOrigins = []) => {
    const combinedOrigins = [...this.trustedOrigins, ...allowedOrigins];
    
    return cors({
      origin: this.isDevelopment ? true : this.originValidator(combinedOrigins),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: this.commonHeaders,
      exposedHeaders: this.exposedHeaders,
      maxAge: this.isProduction ? 3600 : 0
    });
  };

  // Custom secure CORS middleware
  secureCors = (options = {}) => {
    const defaultOptions = {
      origin: this.isDevelopment ? true : this.originValidator(this.trustedOrigins),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: this.commonHeaders,
      exposedHeaders: this.exposedHeaders
    };

    return (req, res, next) => {
      // Apply security headers
      this.securityHeaders(req, res, () => {
        // Apply CORS with merged options
        const corsOptions = { ...defaultOptions, ...options };
        cors(corsOptions)(req, res, next);
      });
    };
  };

  // Get appropriate CORS middleware based on environment and route type
  getCorsMiddleware(type = 'main') {
    switch (type) {
      case 'admin':
        return this.adminCors;
      case 'public':
        return this.publicCors;
      case 'upload':
        return this.uploadCors;
      case 'webhook':
        return this.webhookCors;
      case 'development':
        return this.developmentCors;
      case 'secure':
        return this.secureCors();
      default:
        return this.mainCors;
    }
  }

  // Apply CORS with security headers
  applyWithSecurity = (type = 'main') => {
    return (req, res, next) => {
      this.securityHeaders(req, res, () => {
        this.getCorsMiddleware(type)(req, res, next);
      });
    };
  };

  // CORS error handler
  corsErrorHandler = (err, req, res, next) => {
    if (err && err.message && err.message.includes('CORS')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CORS_ERROR',
          message: 'Cross-Origin Request Blocked',
          details: this.isProduction ? null : err.message
        }
      });
    }
    next(err);
  };

  // Validate CORS configuration
  validateConfig() {
    const issues = [];
    
    if (this.isProduction && this.trustedOrigins.length === 0) {
      issues.push('No trusted origins configured for production');
    }
    
    if (this.isProduction && this.adminOrigins.length === 0) {
      issues.push('No admin origins configured for production');
    }
    
    if (issues.length > 0) {
      console.warn('CORS Configuration Issues:', issues);
    }
    
    return issues.length === 0;
  }
}

module.exports = new CorsMiddleware();