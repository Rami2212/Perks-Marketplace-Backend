const express = require('express');
const { body, param, query } = require('express-validator');
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const { analyticsMiddleware } = require('../middleware/analytics');

const router = express.Router();

// Validation rules
const submitLeadValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('company.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot be more than 100 characters'),
  body('company.size')
    .optional()
    .isIn(['1-10', '11-50', '51-200', '201-1000', '1000+', 'not-specified'])
    .withMessage('Invalid company size'),
  body('company.industry')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Industry cannot be more than 50 characters'),
  body('company.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('perkId')
    .optional()
    .isMongoId()
    .withMessage('Invalid perk ID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message cannot be more than 2000 characters'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('budget.range')
    .optional()
    .isIn(['under-1k', '1k-5k', '5k-10k', '10k-25k', '25k-50k', '50k+', 'not-specified'])
    .withMessage('Invalid budget range'),
  body('timeline')
    .optional()
    .isIn(['immediate', '1-month', '3-months', '6-months', '1-year', 'flexible'])
    .withMessage('Invalid timeline'),
  body('preferredContactMethod')
    .optional()
    .isIn(['email', 'phone', 'whatsapp', 'linkedin', 'not-specified'])
    .withMessage('Invalid preferred contact method'),
  body('consentGiven')
    .optional()
    .isBoolean()
    .withMessage('Consent must be a boolean'),
  body('marketingOptIn')
    .optional()
    .isBoolean()
    .withMessage('Marketing opt-in must be a boolean')
];

const updateLeadValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'converted', 'closed'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('leadScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Lead score must be between 0 and 100'),
  body('qualificationNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Qualification notes cannot be more than 1000 characters')
];

const addNoteValidation = [
  body('content')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note content is required and cannot be more than 1000 characters'),
  body('type')
    .optional()
    .isIn(['general', 'call', 'email', 'meeting', 'follow-up'])
    .withMessage('Invalid note type')
];

const assignLeadValidation = [
  body('assigneeId')
    .isMongoId()
    .withMessage('Valid assignee ID is required')
];

const updateStatusValidation = [
  body('status')
    .isIn(['new', 'contacted', 'qualified', 'converted', 'closed'])
    .withMessage('Valid status is required')
];

const scheduleFollowUpValidation = [
  body('followUpDate')
    .isISO8601()
    .withMessage('Valid follow-up date is required'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters')
];

const recordContactValidation = [
  body('notes')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Contact notes are required and cannot be more than 1000 characters'),
  body('contactMethod')
    .optional()
    .isIn(['email', 'phone', 'whatsapp', 'linkedin', 'other'])
    .withMessage('Invalid contact method')
];

const convertLeadValidation = [
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Conversion value must be a positive number'),
  body('type')
    .optional()
    .isIn(['signup', 'purchase', 'demo', 'consultation', 'partnership', 'other'])
    .withMessage('Invalid conversion type'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot be more than 1000 characters')
];

const bulkUpdateValidation = [
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Updates array is required'),
  body('updates.*.id')
    .isMongoId()
    .withMessage('Each update must have a valid lead ID'),
  body('updates.*.data')
    .isObject()
    .withMessage('Each update must have a data object')
];

// MongoDB ID validation
const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid lead ID')
];

const statusValidation = [
  param('status').isIn(['new', 'contacted', 'qualified', 'converted', 'closed']).withMessage('Invalid status')
];

// Query validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const dateRangeValidation = [
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo')
];

// Public routes (no authentication required)

// Submit lead form (rate limited)
router.post('/submit', 
  rateLimitMiddleware.leadSubmissionLimiter,
  submitLeadValidation,
  analyticsMiddleware,
  leadController.submitLead
);

// Protected routes (authentication required)
router.use(authMiddleware.authenticate);

// Admin only routes
router.use(authMiddleware.adminOnly);

// Lead CRUD operations
router.get('/', 
  paginationValidation,
  dateRangeValidation,
  leadController.getLeads
);

router.get('/search', 
  rateLimitMiddleware.searchLimiter,
  paginationValidation,
  leadController.searchLeads
);

router.get('/stats', 
  dateRangeValidation,
  leadController.getLeadStats
);

router.get('/funnel', 
  dateRangeValidation,
  leadController.getConversionFunnel
);

router.get('/sources', 
  dateRangeValidation,
  leadController.getLeadSources
);

router.get('/analytics', 
  dateRangeValidation,
  leadController.getLeadAnalytics
);

router.get('/recent', 
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  leadController.getRecentLeads
);

router.get('/high-value', 
  query('minScore').optional().isInt({ min: 0, max: 100 }).withMessage('Min score must be between 0 and 100'),
  paginationValidation,
  leadController.getHighValueLeads
);

router.get('/follow-up', 
  paginationValidation,
  leadController.getLeadsNeedingFollowUp
);

router.get('/my-leads', 
  paginationValidation,
  leadController.getMyLeads
);

router.get('/status/:status', 
  statusValidation,
  paginationValidation,
  leadController.getLeadsByStatus
);

router.get('/:id', 
  mongoIdValidation,
  leadController.getLeadById
);

router.put('/:id', 
  mongoIdValidation,
  updateLeadValidation,
  leadController.updateLead
);

router.delete('/:id', 
  mongoIdValidation,
  leadController.deleteLead
);

// Lead management operations
router.post('/:id/notes', 
  mongoIdValidation,
  addNoteValidation,
  leadController.addNote
);

router.post('/:id/assign', 
  mongoIdValidation,
  assignLeadValidation,
  analyticsMiddleware,
  leadController.assignLead
);

router.put('/:id/status', 
  mongoIdValidation,
  updateStatusValidation,
  analyticsMiddleware,
  leadController.updateStatus
);

router.post('/:id/follow-up', 
  mongoIdValidation,
  scheduleFollowUpValidation,
  leadController.scheduleFollowUp
);

router.post('/:id/contact', 
  mongoIdValidation,
  recordContactValidation,
  analyticsMiddleware,
  leadController.recordContactAttempt
);

router.post('/:id/convert', 
  mongoIdValidation,
  convertLeadValidation,
  analyticsMiddleware,
  leadController.convertLead
);

// Bulk operations
router.post('/bulk-update', 
  bulkUpdateValidation,
  leadController.bulkUpdateLeads
);

module.exports = router;