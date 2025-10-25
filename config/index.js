const database = require('./database');
const auth = require('./auth');
const upload = require('./upload');
const email = require('./email');

class Config {
  constructor() {
    this.env = process.env.NODE_ENV || 'dev';
    this.port = parseInt(process.env.PORT) || 3000;
    this.apiVersion = process.env.API_VERSION || 'v1';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  // Application configuration
  getAppConfig() {
    return {
      env: this.env,
      port: this.port,
      apiVersion: this.apiVersion,
      frontendUrl: this.frontendUrl,
      isDevelopment: this.env === 'dev',
      isProduction: this.env === 'prod',
      isTest: this.env === 'test'
    };
  }

  // CORS configuration
  getCorsConfig() {
    return {
      origin: this.env === 'prod' 
        ? [this.frontendUrl] 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }

  // Rate limiting configuration
  getRateLimitConfig() {
    return {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        message: 'Too many requests from this IP, please try again later'
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 auth requests per windowMs
        message: 'Too many authentication attempts, please try again later'
      },
      upload: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // limit each IP to 10 uploads per minute
        message: 'Too many upload requests, please try again later'
      }
    };
  }

  // Security configuration
  getSecurityConfig() {
    return {
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      }
    };
  }

  // Logging configuration
  getLoggingConfig() {
    return {
      level: this.env === 'prod' ? 'info' : 'debug',
      format: this.env === 'prod' ? 'combined' : 'dev',
      logToFile: this.env === 'prod',
      logDirectory: './logs'
    };
  }

  // Analytics configuration
  getAnalyticsConfig() {
    return {
      googleAnalytics: {
        trackingId: process.env.ANALYTICS_TRACKING_ID,
        enabled: !!process.env.ANALYTICS_TRACKING_ID
      },
      customTracking: {
        batchSize: 100,
        flushInterval: 30000, // 30 seconds
        retentionDays: 365
      }
    };
  }
}

module.exports = {
  app: new Config(),
  database,
  auth,
  upload,
  email
};