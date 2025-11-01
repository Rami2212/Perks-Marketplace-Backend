const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const config = require('../config').app;

class RateLimitMiddleware {
    constructor() {
        // Initialize rate limit configuration
        this.rateLimitConfig = config.getRateLimitConfig();

        // Use MongoDB store for production, memory store for development
        this.store = process.env.NODE_ENV === 'production'
            ? new MongoStore({
                uri: process.env.MONGODB_URI,
                collectionName: 'rate_limits',
                expireTimeMs: 15 * 60 * 1000 // 15 minutes
            })
            : undefined;

        // Global rate limiter
        this.globalLimiter = rateLimit({
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
            skip: (req) => req.path === '/health'
        });

        // Authentication rate limiter
        this.authLimiter = rateLimit({
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
            skipSuccessfulRequests: true
        });

        // Upload rate limiter
        this.uploadLimiter = rateLimit({
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

        // Category creation limiter
        this.categoryCreationLimiter = this.createLimiter({
            windowMs: 60 * 1000,
            max: 20,
            message: 'Too many category creation requests, please try again later'
        });

        // Lead submission limiter
        this.leadSubmissionLimiter = this.createLimiter({
            windowMs: 60 * 1000,
            max: 3,
            message: 'Too many lead submissions, please try again later'
        });

        // Partner submission limiter
        this.partnerSubmissionLimiter = this.createLimiter({
            windowMs: 60 * 60 * 1000,
            max: 5,
            message: 'Too many partner applications, please try again later'
        });

        // Search limiter
        this.searchLimiter = this.createLimiter({
            windowMs: 60 * 1000,
            max: 30,
            message: 'Too many search requests, please try again later'
        });

        // Analytics limiter
        this.analyticsLimiter = this.createLimiter({
            windowMs: 60 * 1000,
            max: 60,
            message: 'Too many analytics requests, please try again later'
        });

        // Export limiter
        this.exportLimiter = this.createLimiter({
            windowMs: 60 * 60 * 1000,
            max: 10,
            message: 'Too many export requests, please try again later'
        });

        // Burst limiter
        this.burstLimiter = this.createLimiter({
            windowMs: 1000,
            max: 5,
            message: 'Too many requests in a short time, please slow down'
        });

        // Dynamic user type limiter
        this.dynamicLimiter = this.createUserTypeLimiter({
            anonymous: 50,
            authenticated: 200,
            contentEditor: 500,
            superAdmin: 1000
        });
    }

    // Generic limiter factory
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

    // User-type based dynamic limiter
    createUserTypeLimiter = (limits) => {
        return (req, res, next) => {
            const user = req.user;
            let limit = limits.anonymous || 10;

            if (user) {
                if (user.role === 'super_admin') limit = limits.superAdmin || 1000;
                else if (user.role === 'content_editor') limit = limits.contentEditor || 500;
                else limit = limits.authenticated || 100;
            }

            const limiter = rateLimit({
                windowMs: 15 * 60 * 1000,
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
                keyGenerator: (req) => user ? `user_${user.id}` : req.ip
            });

            limiter(req, res, next);
        };
    };

    // Custom endpoint limiter
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
