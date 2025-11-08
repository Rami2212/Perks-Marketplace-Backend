const leadService = require('../services/leadService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');

class LeadController {
  // Submit new lead (public endpoint)
  submitLead = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    // Extract request information for tracking
    const requestInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      utmParams: {
        source: req.query.utm_source,
        medium: req.query.utm_medium,
        campaign: req.query.utm_campaign,
        term: req.query.utm_term,
        content: req.query.utm_content
      },
      clientId: req.user.clientId,
      userId: req.user.id
    };

    const lead = await leadService.submitLead(req.body, requestInfo);

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead submitted successfully'
    });
  });

  // Get all leads (admin)
  getLeads = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      source,
      priority,
      assignedTo,
      perkId,
      categoryId,
      dateFrom,
      dateTo,
      minScore,
      maxScore,
      country,
      city,
      search,
      sortBy,
      needsFollowUp
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      source,
      priority,
      assignedTo,
      perkId,
      categoryId,
      dateFrom,
      dateTo,
      minScore: minScore ? parseInt(minScore) : undefined,
      maxScore: maxScore ? parseInt(maxScore) : undefined,
      country,
      city,
      search,
      sortBy,
      needsFollowUp: needsFollowUp === 'true'
    };

    const result = await leadService.getLeads(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get lead by ID
  getLeadById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const lead = await leadService.getLeadById(id);

    res.status(200).json({
      success: true,
      data: lead
    });
  });

  // Update lead
  updateLead = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const updatedLead = await leadService.updateLead(id, req.body, req.user.id);

    res.status(200).json({
      success: true,
      data: updatedLead,
      message: 'Lead updated successfully'
    });
  });

  // Delete lead
  deleteLead = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const result = await leadService.deleteLead(id);

    res.status(200).json({
      success: true,
      data: result
    });
  });

  // Add note to lead
  addNote = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const lead = await leadService.addNoteToLead(id, req.body, req.user.id);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Note added successfully'
    });
  });

  // Assign lead
  assignLead = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const { assigneeId } = req.body;

    const lead = await leadService.assignLead(id, assigneeId, req.user.id);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead assigned successfully'
    });
  });

  // Update lead status
  updateStatus = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const lead = await leadService.updateLeadStatus(id, status, req.user.id);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead status updated successfully'
    });
  });

  // Schedule follow-up
  scheduleFollowUp = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const { followUpDate, notes } = req.body;

    const lead = await leadService.scheduleFollowUp(id, followUpDate, req.user.id, notes);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Follow-up scheduled successfully'
    });
  });

  // Record contact attempt
  recordContactAttempt = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const { notes, contactMethod } = req.body;

    const lead = await leadService.recordContactAttempt(id, req.user.id, notes, contactMethod);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Contact attempt recorded successfully'
    });
  });

  // Search leads
  searchLeads = catchAsync(async (req, res) => {
    const { 
      q: query, 
      page = 1, 
      limit = 20, 
      status, 
      source, 
      assignedTo, 
      priority 
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query is required'
        }
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      source,
      assignedTo,
      priority
    };

    const result = await leadService.searchLeads(query, options);

    res.status(200).json({
      success: true,
      data: result.leads,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Get lead statistics
  getLeadStats = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const stats = await leadService.getLeadStats(dateRange);

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  // Get conversion funnel
  getConversionFunnel = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const funnel = await leadService.getConversionFunnel(dateRange);

    res.status(200).json({
      success: true,
      data: funnel
    });
  });

  // Get lead sources
  getLeadSources = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const sources = await leadService.getLeadSources(dateRange);

    res.status(200).json({
      success: true,
      data: sources
    });
  });

  // Get leads by status
  getLeadsByStatus = catchAsync(async (req, res) => {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await leadService.getLeadsByStatus(status, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get leads needing follow-up
  getLeadsNeedingFollowUp = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await leadService.getLeadsNeedingFollowUp(parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get my assigned leads
  getMyLeads = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await leadService.getLeadsByAssignee(req.user.id, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get recent leads
  getRecentLeads = catchAsync(async (req, res) => {
    const { days = 7, limit = 20 } = req.query;

    const result = await leadService.getRecentLeads(parseInt(days), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get high-value leads
  getHighValueLeads = catchAsync(async (req, res) => {
    const { minScore = 70, page = 1, limit = 20 } = req.query;

    const result = await leadService.getHighValueLeads(parseInt(minScore), parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get lead analytics
  getLeadAnalytics = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const analytics = await leadService.getLeadAnalytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics
    });
  });

  // Convert lead
  convertLead = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { id } = req.params;
    const conversionData = req.body;

    const lead = await leadService.convertLead(id, conversionData, req.user.id);

    res.status(200).json({
      success: true,
      data: lead,
      message: 'Lead converted successfully'
    });
  });

  // Bulk update leads
  bulkUpdateLeads = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { updates } = req.body;

    const result = await leadService.bulkUpdateLeads(updates, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Leads updated successfully'
    });
  });
}

module.exports = new LeadController();