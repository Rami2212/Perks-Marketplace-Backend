const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const config = require('../config').app;

class LoggingMiddleware {
  constructor() {
    this.loggingConfig = config.getLoggingConfig();
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (this.loggingConfig.logToFile && !fs.existsSync(this.loggingConfig.logDirectory)) {
      fs.mkdirSync(this.loggingConfig.logDirectory, { recursive: true });
    }
  }

  // Custom Morgan token for user ID
  setupCustomTokens() {
    morgan.token('user-id', (req) => {
      return req.user ? req.user.id : 'anonymous';
    });

    morgan.token('user-role', (req) => {
      return req.user ? req.user.role : 'guest';
    });

    morgan.token('request-id', (req) => {
      return req.requestId || 'unknown';
    });

    morgan.token('response-time-ms', (req, res) => {
      return `${Date.now() - req.startTime}ms`;
    });
  }

  // Development logging
  developmentLogger = () => {
    this.setupCustomTokens();
    
    return morgan('dev', {
      skip: (req) => req.path === '/health'
    });
  };

  // Production logging
  productionLogger = () => {
    this.setupCustomTokens();

    const logFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

    const accessLogStream = fs.createWriteStream(
      path.join(this.loggingConfig.logDirectory, 'access.log'),
      { flags: 'a' }
    );

    return morgan(logFormat, {
      stream: accessLogStream,
      skip: (req) => req.path === '/health'
    });
  };

  // Error logging
  errorLogger = () => {
    const errorLogStream = fs.createWriteStream(
      path.join(this.loggingConfig.logDirectory, 'error.log'),
      { flags: 'a' }
    );

    return morgan('combined', {
      stream: errorLogStream,
      skip: (req, res) => res.statusCode < 400
    });
  };

  // Custom request logging middleware
  requestLogger = (req, res, next) => {
    req.startTime = Date.now();
    req.requestId = this.generateRequestId();

    // Log request start
    this.logRequest(req);

    // Log response end
    const originalSend = res.send;
    res.send = function(data) {
      res.responseTime = Date.now() - req.startTime;
      req.responseData = data;
      
      // Log response
      this.logResponse(req, res);
      
      originalSend.call(this, data);
    }.bind(this);

    next();
  };

  // Security logging
  securityLogger = (req, res, next) => {
    // Log suspicious activities
    const suspiciousPatterns = [
      /admin/i,
      /\.\.\//, // Path traversal
      /<script>/i, // XSS attempts
      /union.*select/i, // SQL injection
      /etc\/passwd/i // File access attempts
    ];

    const url = req.originalUrl;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

    if (isSuspicious) {
      this.logSecurityEvent({
        type: 'SUSPICIOUS_REQUEST',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: url,
        method: req.method,
        timestamp: new Date().toISOString(),
        user: req.user ? req.user.id : 'anonymous'
      });
    }

    next();
  };

  // Analytics logging
  analyticsLogger = (req, res, next) => {
    if (req.path.startsWith('/api/') && req.method !== 'OPTIONS') {
      this.logAnalyticsEvent({
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        user: req.user ? req.user.id : 'anonymous',
        responseTime: res.responseTime,
        statusCode: res.statusCode
      });
    }

    next();
  };

  // Get appropriate logger based on environment
  getLogger() {
    const appConfig = config.getAppConfig();

    if (appConfig.isDevelopment) {
      return this.developmentLogger();
    }

    if (appConfig.isProduction && this.loggingConfig.logToFile) {
      return [this.productionLogger(), this.errorLogger()];
    }

    return this.productionLogger();
  }

  // Helper methods
  generateRequestId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  logRequest(req) {
    if (this.loggingConfig.level === 'debug') {
      console.log(`[${new Date().toISOString()}] ${req.requestId} ${req.method} ${req.originalUrl} - ${req.ip}`);
    }
  }

  logResponse(req, res) {
    if (this.loggingConfig.level === 'debug') {
      console.log(`[${new Date().toISOString()}] ${req.requestId} ${res.statusCode} - ${res.responseTime}ms`);
    }
  }

  logSecurityEvent(event) {
    const securityLogPath = path.join(this.loggingConfig.logDirectory, 'security.log');
    const logEntry = JSON.stringify(event) + '\n';

    if (this.loggingConfig.logToFile) {
      fs.appendFileSync(securityLogPath, logEntry);
    }

    console.warn('SECURITY EVENT:', event);
  }

  logAnalyticsEvent(event) {
    // In production, send to analytics service
    if (config.getAppConfig().isProduction) {
      // Send to external analytics service
      console.log('Analytics:', event);
    }
  }
}

module.exports = new LoggingMiddleware();