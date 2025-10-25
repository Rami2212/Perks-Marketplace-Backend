const config = require('../config').app;

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// Database error class
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

// Authentication error class
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Authorization error class
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class ErrorHandler {
  // Main error handling middleware
  handle = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    this.logError(error, req);

    // Handle different types of errors
    if (err.name === 'CastError') {
      error = this.handleCastErrorDB(error);
    }

    if (err.code === 11000) {
      error = this.handleDuplicateFieldsDB(error);
    }

    if (err.name === 'ValidationError') {
      error = this.handleValidationErrorDB(error);
    }

    if (err.name === 'JsonWebTokenError') {
      error = this.handleJWTError();
    }

    if (err.name === 'TokenExpiredError') {
      error = this.handleJWTExpiredError();
    }

    if (err.name === 'MongoNetworkError') {
      error = this.handleMongoNetworkError();
    }

    if (err.name === 'MulterError') {
      error = this.handleMulterError(error);
    }

    this.sendErrorResponse(error, res);
  };

  // Handle MongoDB cast errors
  handleCastErrorDB(err) {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400, 'INVALID_ID');
  }

  // Handle MongoDB duplicate field errors
  handleDuplicateFieldsDB(err) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;
    return new AppError(message, 409, 'DUPLICATE_FIELD');
  }

  // Handle MongoDB validation errors
  handleValidationErrorDB(err) {
    const errors = Object.values(err.errors).map(el => ({
      field: el.path,
      message: el.message,
      value: el.value
    }));
    
    const message = 'Invalid input data';
    return new ValidationError(message, errors);
  }

  // Handle JWT errors
  handleJWTError() {
    return new AuthenticationError('Invalid token. Please log in again!');
  }

  handleJWTExpiredError() {
    return new AuthenticationError('Your token has expired! Please log in again.');
  }

  // Handle MongoDB network errors
  handleMongoNetworkError() {
    return new DatabaseError('Database connection failed. Please try again later.');
  }

  // Handle Multer upload errors
  handleMulterError(err) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return new AppError('File too large', 400, 'FILE_TOO_LARGE');
      case 'LIMIT_FILE_COUNT':
        return new AppError('Too many files', 400, 'TOO_MANY_FILES');
      case 'LIMIT_UNEXPECTED_FILE':
        return new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
      default:
        return new AppError('File upload error', 400, 'UPLOAD_ERROR');
    }
  }

  // Send error response
  sendErrorResponse(err, res) {
    const appConfig = config.getAppConfig();

    // Operational, trusted error: send message to client
    if (err.isOperational) {
      const response = {
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      };

      if (err.details) {
        response.error.details = err.details;
      }

      // Add stack trace in development
      if (appConfig.isDevelopment) {
        response.error.stack = err.stack;
      }

      return res.status(err.statusCode).json(response);
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: appConfig.isDevelopment 
          ? err.message 
          : 'Something went wrong!'
      }
    });
  }

  // Log errors
  logError(error, req) {
    const appConfig = config.getAppConfig();
    
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? req.user.id : 'anonymous'
      }
    };

    if (appConfig.isDevelopment) {
      console.error('Error Details:', JSON.stringify(logData, null, 2));
    } else {
      // In production, log to external service (e.g., Sentry, LogRocket, etc.)
      console.error(JSON.stringify(logData));
    }
  }

  // 404 Not Found handler
  notFound = (req, res, next) => {
    const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
    next(err);
  };

  // Async error wrapper
  catchAsync = (fn) => {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  };

  // Global unhandled rejection handler
  handleUnhandledRejection() {
    process.on('unhandledRejection', (err, promise) => {
      console.log('UNHANDLED REJECTION! 💥 Shutting down...');
      console.log(err.name, err.message);
      process.exit(1);
    });
  }

  // Global uncaught exception handler
  handleUncaughtException() {
    process.on('uncaughtException', (err) => {
      console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      console.log(err.name, err.message);
      process.exit(1);
    });
  }
}

const errorHandler = new ErrorHandler();

module.exports = {
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  errorHandler: errorHandler.handle,
  notFound: errorHandler.notFound,
  catchAsync: errorHandler.catchAsync,
  setupGlobalHandlers: () => {
    errorHandler.handleUnhandledRejection();
    errorHandler.handleUncaughtException();
  }
};