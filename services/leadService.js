const leadRepository = require('../repositories/leadRepository');
const emailService = require('./emailService');
const analyticsService = require('./analyticsService');
const { AppError } = require('../middleware/errorHandler');
const { LEAD_STATUSES } = require('../utils/constants');

class LeadService {
  // Submit new lead (public form submission)
  async submitLead(leadData, requestInfo = {}) {
    try {
      // Extract request information
      const { ipAddress, userAgent, referrer, utmParams } = requestInfo;

      // Check for existing lead with same email and perk
      if (leadData.perkId) {
        const existingLead = await leadRepository.findByEmailAndPerk(
          leadData.email,
          leadData.perkId
        );

        if (existingLead) {
          throw new AppError(
            'A lead has already been submitted for this perk with this email address',
            409,
            'DUPLICATE_SUBMISSION'
          );
        }
      }

      // Enrich lead data with tracking information
      const enrichedLeadData = {
        ...leadData,
        ipAddress,
        userAgent,
        referrer,
        utmParams,
        source: leadData.source || 'website',
        status: LEAD_STATUSES.NEW,
        consentGiven: leadData.consentGiven || false,
        marketingOptIn: leadData.marketingOptIn || false,
        dataProcessingConsent: true,
        consentDate: new Date()
      };

      // Create lead
      const lead = await leadRepository.create(enrichedLeadData);

      // Send notification emails
      await this.sendLeadNotifications(lead);

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_SUBMISSION', {
      //     leadId: lead._id.toString(),
      //     perkId: lead.perkId?.toString(),
      //     categoryId: lead.categoryId?.toString(),
      //     source: lead.source,
      //     score: lead.leadScore,
      //     value: lead.leadScore || 0
      //   }, {
      //     clientId,
      //     userId: lead._id.toString()
      //   });
      // }

      return await leadRepository.findById(lead._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to submit lead', 500, 'LEAD_SUBMISSION_ERROR');
    }
  }

  // Get lead by ID
  async getLeadById(id) {
    try {
      const lead = await leadRepository.findById(id, true);

      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }

      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get lead', 500, 'GET_LEAD_ERROR');
    }
  }

  // Get all leads with filtering and pagination
  async getLeads(options = {}) {
    try {
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
      } = options;

      const filters = {};
      if (status) filters.status = status;
      if (source) filters.source = source;
      if (priority) filters.priority = priority;
      if (assignedTo) filters.assignedTo = assignedTo;
      if (perkId) filters.perkId = perkId;
      if (categoryId) filters.categoryId = categoryId;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (minScore !== undefined) filters.minScore = minScore;
      if (maxScore !== undefined) filters.maxScore = maxScore;
      if (country) filters.country = country;
      if (city) filters.city = city;
      if (search) filters.search = search;
      if (sortBy) filters.sortBy = sortBy;
      if (needsFollowUp) filters.needsFollowUp = needsFollowUp;

      return await leadRepository.findAll(filters, page, limit, true);
    } catch (error) {
      throw new AppError('Failed to get leads', 500, 'GET_LEADS_ERROR');
    }
  }

  // Update lead
  async updateLead(id, updateData, userId) {
    try {
      const lead = await leadRepository.findById(id);
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }

      // Set updater
      updateData.updatedBy = userId;

      const updatedLead = await leadRepository.update(id, updateData);

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_STATUS_CHANGE', {
      //     leadId: id,
      //     oldStatus,
      //     newStatus: status,
      //     updatedBy: userId
      //   }, {
      //     clientId,
      //     userId: userId
      //   });
      // }

      return await leadRepository.findById(updatedLead._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update lead', 500, 'UPDATE_LEAD_ERROR');
    }
  }

  // Delete lead
  async deleteLead(id) {
    try {
      const lead = await leadRepository.findById(id);
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }

      await leadRepository.delete(id);

      return { message: 'Lead deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete lead', 500, 'DELETE_LEAD_ERROR');
    }
  }

  // Add note to lead
  async addNoteToLead(id, noteData, userId) {
    try {
      const noteWithUser = {
        ...noteData,
        addedBy: userId
      };

      return await leadRepository.addNote(id, noteWithUser);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add note to lead', 500, 'ADD_NOTE_ERROR');
    }
  }

  // Assign lead to user
  async assignLead(id, assigneeId, assignedBy, clientId = null) {
    try {
      const lead = await leadRepository.assignLead(id, assigneeId);

      // Update the assignedBy field
      await leadRepository.update(id, { updatedBy: assignedBy });

      // Send assignment notification
      if (emailService.isConfigured()) {
        await this.sendAssignmentNotification(lead, assigneeId);
      }

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_ASSIGNED', {
      //     leadId: id,
      //     assignedTo: assigneeId,
      //     assignedBy: assignedBy
      //   }, {
      //     clientId,
      //     userId: assignedBy
      //   });
      // }

      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to assign lead', 500, 'ASSIGN_LEAD_ERROR');
    }
  }

  // Update lead status
  async updateLeadStatus(id, status, userId, clientId = null) {
    try {
      const lead = await leadRepository.findById(id);
      const oldStatus = lead.status;

      const updatedLead = await leadRepository.updateStatus(id, status, userId);

      // Send status change notifications
      if (status === LEAD_STATUSES.CONVERTED) {
        await this.sendConversionNotification(updatedLead);
      }

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_STATUS_CHANGE', {
      //     leadId: id,
      //     oldStatus,
      //     newStatus: status,
      //     updatedBy: userId
      //   }, {
      //     clientId,
      //     userId: userId
      //   });
      // }

      return updatedLead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update lead status', 500, 'UPDATE_STATUS_ERROR');
    }
  }

  // Schedule follow-up
  async scheduleFollowUp(id, followUpDate, userId, notes) {
    try {
      const lead = await leadRepository.scheduleFollowUp(id, followUpDate, userId);

      // Add note about follow-up if provided
      if (notes) {
        await leadRepository.addNote(id, {
          content: notes,
          addedBy: userId,
          type: 'follow-up'
        });
      }

      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to schedule follow-up', 500, 'SCHEDULE_FOLLOWUP_ERROR');
    }
  }

  // Record contact attempt
  async recordContactAttempt(id, userId, notes, contactMethod = 'email', clientId = null) {
    try {
      const lead = await leadRepository.recordContactAttempt(id, userId, notes);

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_CONTACT_ATTEMPT', {
      //     leadId: id,
      //     contactMethod,
      //     userId
      //   }, {
      //     clientId,
      //     userId
      //   });
      // }

      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to record contact attempt', 500, 'RECORD_CONTACT_ERROR');
    }
  }

  // Search leads
  async searchLeads(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
      }

      return await leadRepository.search(query.trim(), options);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search leads', 500, 'SEARCH_LEADS_ERROR');
    }
  }

  // Get lead statistics
  async getLeadStats(dateRange = {}) {
    try {
      return await leadRepository.getStats(dateRange);
    } catch (error) {
      throw new AppError('Failed to get lead statistics', 500, 'GET_STATS_ERROR');
    }
  }

  // Get conversion funnel
  async getConversionFunnel(dateRange = {}) {
    try {
      return await leadRepository.getConversionFunnel(dateRange);
    } catch (error) {
      throw new AppError('Failed to get conversion funnel', 500, 'GET_FUNNEL_ERROR');
    }
  }

  // Get lead sources
  async getLeadSources(dateRange = {}) {
    try {
      return await leadRepository.getLeadSources(dateRange);
    } catch (error) {
      throw new AppError('Failed to get lead sources', 500, 'GET_SOURCES_ERROR');
    }
  }

  // Get leads by status
  async getLeadsByStatus(status, page = 1, limit = 20) {
    try {
      return await leadRepository.getLeadsByStatus(status, page, limit);
    } catch (error) {
      throw new AppError('Failed to get leads by status', 500, 'GET_LEADS_BY_STATUS_ERROR');
    }
  }

  // Get leads needing follow-up
  async getLeadsNeedingFollowUp(page = 1, limit = 20) {
    try {
      return await leadRepository.getLeadsNeedingFollowUp(page, limit);
    } catch (error) {
      throw new AppError('Failed to get leads needing follow-up', 500, 'GET_FOLLOWUP_LEADS_ERROR');
    }
  }

  // Get leads by assignee
  async getLeadsByAssignee(userId, page = 1, limit = 20) {
    try {
      return await leadRepository.getLeadsByAssignee(userId, page, limit);
    } catch (error) {
      throw new AppError('Failed to get leads by assignee', 500, 'GET_ASSIGNED_LEADS_ERROR');
    }
  }

  // Get recent leads
  async getRecentLeads(days = 7, limit = 20) {
    try {
      return await leadRepository.getRecentLeads(days, limit);
    } catch (error) {
      throw new AppError('Failed to get recent leads', 500, 'GET_RECENT_LEADS_ERROR');
    }
  }

  // Get high-value leads
  async getHighValueLeads(minScore = 70, page = 1, limit = 20) {
    try {
      return await leadRepository.getHighValueLeads(minScore, page, limit);
    } catch (error) {
      throw new AppError('Failed to get high-value leads', 500, 'GET_HIGH_VALUE_LEADS_ERROR');
    }
  }

  // Get lead analytics
  async getLeadAnalytics(dateRange = {}) {
    try {
      return await leadRepository.getAnalytics(dateRange);
    } catch (error) {
      throw new AppError('Failed to get lead analytics', 500, 'GET_ANALYTICS_ERROR');
    }
  }

  // Bulk update leads
  async bulkUpdateLeads(updates, userId) {
    try {
      const updatesWithUser = updates.map(update => ({
        ...update,
        data: {
          ...update.data,
          updatedBy: userId,
          updatedAt: new Date()
        }
      }));

      return await leadRepository.bulkUpdate(updatesWithUser);
    } catch (error) {
      throw new AppError('Failed to bulk update leads', 500, 'BULK_UPDATE_ERROR');
    }
  }

  // Convert lead
  async convertLead(id, conversionData, userId, clientId = null) {
    try {
      const updateData = {
        status: LEAD_STATUSES.CONVERTED,
        convertedAt: new Date(),
        conversionValue: conversionData.value,
        conversionType: conversionData.type,
        updatedBy: userId
      };

      const lead = await leadRepository.update(id, updateData);

      // Add conversion note
      if (conversionData.notes) {
        await leadRepository.addNote(id, {
          content: conversionData.notes,
          addedBy: userId,
          type: 'general'
        });
      }

      // Send conversion notification
      await this.sendConversionNotification(lead);

      // Track analytics event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('LEAD_CONVERTED', {
      //     leadId: id,
      //     conversionValue: conversionData.value || 0,
      //     conversionType: conversionData.type,
      //     convertedBy: userId,
      //     value: conversionData.value || 0
      //   }, {
      //     clientId,
      //     userId: userId
      //   });
      // }

      return await leadRepository.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to convert lead', 500, 'CONVERT_LEAD_ERROR');
    }
  }

  // Send lead notifications
  async sendLeadNotifications(lead) {
    try {
      if (!emailService.isConfigured()) return;

      // Send to admin/sales team
      await emailService.sendLeadNotification(lead);

      // Send confirmation to lead (if they opted in)
      if (lead.marketingOptIn) {
        await emailService.sendLeadConfirmation(lead);
      }
    } catch (error) {
      console.error('Error sending lead notifications:', error);
      // Don't throw error as this is not critical for lead creation
    }
  }

  // Send assignment notification
  async sendAssignmentNotification(lead, assigneeId) {
    try {
      if (!emailService.isConfigured()) return;

      // Get assignee details and send notification
      // Implementation depends on your email service structure
      console.log(`Lead ${lead._id} assigned to user ${assigneeId}`);
    } catch (error) {
      console.error('Error sending assignment notification:', error);
    }
  }

  // Send conversion notification
  async sendConversionNotification(lead) {
    try {
      if (!emailService.isConfigured()) return;

      // Send to admin/sales team about conversion
      console.log(`Lead ${lead._id} converted`);
    } catch (error) {
      console.error('Error sending conversion notification:', error);
    }
  }
}

module.exports = new LeadService();