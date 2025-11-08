const cors = require('cors');
const config = require('../config').app;

class CorsMiddleware {
  constructor() {
    this.corsConfig = config.getCorsConfig();

    // Main CORS configuration
    this.corsHandler = cors({
      origin: this.corsConfig.origin,
      credentials: this.corsConfig.credentials,
      optionsSuccessStatus: this.corsConfig.optionsSuccessStatus,
      methods: this.corsConfig.methods,
      allowedHeaders: [
        this.corsConfig.allowedHeaders,
        'GA-Client-ID',
        'GA-Source'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ],
      preflightContinue: false
    });

    // File upload CORS
    this.uploadCors = cors({
      origin: this.corsConfig.origin,
      credentials: true,
      methods: ['POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With'
      ],
      maxAge: 86400 // 24 hours preflight cache
    });

    // Development CORS (very permissive)
    this.developmentCors = cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: '*',
      exposedHeaders: '*'
    });
  }

  // Dynamic CORS for specific routes
  dynamicCors = (allowedOrigins = []) => {
    return cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || this.corsConfig.origin.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: this.corsConfig.methods,
      allowedHeaders: this.corsConfig.allowedHeaders
    });
  };

  // Strict CORS for admin endpoints
  adminCors = cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV === 'prod') {
        const adminOrigins = [
          process.env.ADMIN_URL,
          process.env.FRONTEND_URL
        ].filter(Boolean);

        if (!origin || adminOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Admin access not allowed from this origin'));
      }

      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Admin-Token'
    ]
  });

  // Public API CORS
  publicCors = cors({
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'X-Requested-With',
      'User-Agent'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining'
    ]
  });

  // Webhook CORS
  webhookCors = cors({
    origin: (origin, callback) => {
      const trustedOrigins = [
        'https://api.stripe.com',
        'https://hooks.zapier.com',
        'https://api.mailchimp.com'
      ];

      if (!origin || trustedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Webhook origin not allowed'));
    },
    credentials: false,
    methods: ['POST'],
    allowedHeaders: [
      'Content-Type',
      'X-Webhook-Signature',
      'User-Agent'
    ]
  });

  // Custom secure CORS middleware
  secureCors = (options = {}) => {
    return (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      const corsOptions = {
        ...this.corsConfig,
        ...options
      };

      cors(corsOptions)(req, res, next);
    };
  };

  // Get appropriate CORS middleware based on environment
  getCorsMiddleware() {
    if (process.env.NODE_ENV === 'dev') return this.developmentCors;
    if (process.env.NODE_ENV === 'test') return this.publicCors;
    return this.corsHandler;
  }
}

module.exports = new CorsMiddleware();
