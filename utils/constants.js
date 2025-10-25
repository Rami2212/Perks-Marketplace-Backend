// Application constants
const CONSTANTS = {
  // User roles
  USER_ROLES: {
    SUPER_ADMIN: 'super_admin',
    CONTENT_EDITOR: 'content_editor'
  },

  // User statuses
  USER_STATUSES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended'
  },

  // Perk statuses
  PERK_STATUSES: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    DRAFT: 'draft',
    EXPIRED: 'expired'
  },

  // Perk locations
  PERK_LOCATIONS: {
    MALAYSIA: 'Malaysia',
    SINGAPORE: 'Singapore',
    GLOBAL: 'Global'
  },

  // Redemption methods
  REDEMPTION_METHODS: {
    AFFILIATE_LINK: 'affiliate_link',
    COUPON_CODE: 'coupon_code',
    FORM_SUBMISSION: 'form_submission'
  },

  // Lead statuses
  LEAD_STATUSES: {
    NEW: 'new',
    CONTACTED: 'contacted',
    QUALIFIED: 'qualified',
    CONVERTED: 'converted',
    CLOSED: 'closed'
  },

  // Analytics event types
  ANALYTICS_EVENTS: {
    IMPRESSION: 'impression',
    CLICK: 'click',
    AFFILIATE_CLICK: 'affiliate_click',
    FORM_VIEW: 'form_view',
    FORM_SUBMIT: 'form_submit'
  },

  // Blog post statuses
  BLOG_STATUSES: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
  },

  // Partner statuses
  PARTNER_STATUSES: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CONVERTED: 'converted'
  },

  // Partner offer types
  OFFER_TYPES: {
    SAAS_AI_TOOLS: 'SaaS/AI Tools',
    B2B_SERVICES: 'B2B Services',
    LIFESTYLE: 'Lifestyle'
  },

  // Static page types
  PAGE_TYPES: {
    ABOUT: 'about',
    CONTACT: 'contact',
    TOS: 'tos',
    PRIVACY: 'privacy',
    FAQ: 'faq',
    CUSTOM: 'custom'
  },

  // File upload types
  UPLOAD_TYPES: {
    IMAGE: 'image',
    DOCUMENT: 'document',
    AVATAR: 'avatar'
  },

  // Allowed image types
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],

  // File size limits (in bytes)
  FILE_SIZE_LIMITS: {
    IMAGE: 5 * 1024 * 1024, // 5MB
    DOCUMENT: 10 * 1024 * 1024, // 10MB
    AVATAR: 2 * 1024 * 1024 // 2MB
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Rate limiting
  RATE_LIMITS: {
    GLOBAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 1000
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 10
    },
    UPLOAD: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_REQUESTS: 10
    }
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 5 * 60, // 5 minutes
    MEDIUM: 30 * 60, // 30 minutes
    LONG: 60 * 60, // 1 hour
    VERY_LONG: 24 * 60 * 60 // 24 hours
  },

  // Email templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    LEAD_NOTIFICATION: 'lead-notification',
    PARTNER_SUBMISSION: 'partner-submission',
    PASSWORD_RESET: 'password-reset',
    PARTNER_APPROVAL: 'partner-approval'
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Error codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_FIELD: 'DUPLICATE_FIELD',
    INVALID_ID: 'INVALID_ID',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  },

  // JWT token types
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    FILE_ACCESS: 'file_access'
  },

  // Sort orders
  SORT_ORDERS: {
    ASC: 'asc',
    DESC: 'desc'
  },

  // Date formats
  DATE_FORMATS: {
    DATE_ONLY: 'YYYY-MM-DD',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
    ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    DISPLAY: 'MMM DD, YYYY',
    DISPLAY_WITH_TIME: 'MMM DD, YYYY [at] h:mm A'
  },

  // Analytics periods
  ANALYTICS_PERIODS: {
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    THIS_WEEK: 'week',
    LAST_WEEK: 'last_week',
    THIS_MONTH: 'month',
    LAST_MONTH: 'last_month',
    THIS_QUARTER: 'quarter',
    THIS_YEAR: 'year',
    LAST_30_DAYS: 'last_30_days',
    LAST_90_DAYS: 'last_90_days',
    CUSTOM: 'custom'
  },

  // Search types
  SEARCH_TYPES: {
    ALL: 'all',
    PERKS: 'perks',
    BLOG: 'blog',
    CATEGORIES: 'categories'
  },

  // Image processing sizes
  IMAGE_SIZES: {
    THUMBNAIL: { width: 150, height: 150 },
    SMALL: { width: 300, height: 300 },
    MEDIUM: { width: 500, height: 500 },
    LARGE: { width: 1200, height: 1200 },
    BANNER: { width: 1920, height: 600 },
    LOGO: { width: 200, height: 200 }
  },

  // Regular expressions
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
    URL: /^https?:\/\/.+/,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },

  // API versions
  API_VERSIONS: {
    V1: 'v1',
    V2: 'v2'
  },

  // Environment types
  ENVIRONMENTS: {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test',
    STAGING: 'staging'
  },

  // Database collections
  COLLECTIONS: {
    USERS: 'users',
    PERKS: 'perks',
    CATEGORIES: 'categories',
    LEADS: 'leads',
    ANALYTICS_EVENTS: 'analytics_events',
    BLOG_POSTS: 'blog_posts',
    PARTNERS: 'partners',
    SITE_SETTINGS: 'site_settings',
    STATIC_PAGES: 'static_pages'
  },

  // Security settings
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    JWT_EXPIRES_IN: '24h',
    JWT_REFRESH_EXPIRES_IN: '7d',
    PASSWORD_RESET_EXPIRES_IN: '1h',
    EMAIL_VERIFICATION_EXPIRES_IN: '24h',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
  },

  // External services
  EXTERNAL_SERVICES: {
    GOOGLE_ANALYTICS: 'google_analytics',
    META_PIXEL: 'meta_pixel',
    MAILCHIMP: 'mailchimp',
    SENDGRID: 'sendgrid'
  }
};

// Export individual constants for easier importing
module.exports = {
  CONSTANTS,
  USER_ROLES: CONSTANTS.USER_ROLES,
  USER_STATUSES: CONSTANTS.USER_STATUSES,
  PERK_STATUSES: CONSTANTS.PERK_STATUSES,
  PERK_LOCATIONS: CONSTANTS.PERK_LOCATIONS,
  REDEMPTION_METHODS: CONSTANTS.REDEMPTION_METHODS,
  LEAD_STATUSES: CONSTANTS.LEAD_STATUSES,
  ANALYTICS_EVENTS: CONSTANTS.ANALYTICS_EVENTS,
  BLOG_STATUSES: CONSTANTS.BLOG_STATUSES,
  PARTNER_STATUSES: CONSTANTS.PARTNER_STATUSES,
  OFFER_TYPES: CONSTANTS.OFFER_TYPES,
  PAGE_TYPES: CONSTANTS.PAGE_TYPES,
  HTTP_STATUS: CONSTANTS.HTTP_STATUS,
  ERROR_CODES: CONSTANTS.ERROR_CODES,
  TOKEN_TYPES: CONSTANTS.TOKEN_TYPES,
  SORT_ORDERS: CONSTANTS.SORT_ORDERS,
  DATE_FORMATS: CONSTANTS.DATE_FORMATS,
  ANALYTICS_PERIODS: CONSTANTS.ANALYTICS_PERIODS,
  SEARCH_TYPES: CONSTANTS.SEARCH_TYPES,
  IMAGE_SIZES: CONSTANTS.IMAGE_SIZES,
  REGEX: CONSTANTS.REGEX,
  PAGINATION: CONSTANTS.PAGINATION,
  SECURITY: CONSTANTS.SECURITY
};