const Lead = require('../models/Lead');
const { AppError } = require('../middleware/errorHandler');
const paginationUtils = require('../utils/pagination');

class LeadRepository {
  // Create new lead
  async create(leadData) {
    try {
      const lead = new Lead(leadData);
      return await lead.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      if (error.code === 11000) {
        throw new AppError('Duplicate lead submission detected', 409, 'DUPLICATE_LEAD');
      }
      throw new AppError('Database error while creating lead', 500, 'DATABASE_ERROR');
    }
  }

  // Find lead by ID
  async findById(id, populate = false) {
    try {
      let query = Lead.findById(id);
      
      if (populate) {
        query = query
          .populate('perkId', 'title slug vendor.name')
          .populate('categoryId', 'name slug')
          .populate('assignedTo', 'name email')
          .populate('updatedBy', 'name email')
          .populate('notes.addedBy', 'name email');
      }
      
      return await query;
    } catch (error) {
      throw new AppError('Database error while finding lead', 500, 'DATABASE_ERROR');
    }
  }

  // Find lead by email and perk
  async findByEmailAndPerk(email, perkId) {
    try {
      return await Lead.findOne({ email, perkId });
    } catch (error) {
      throw new AppError('Database error while finding lead', 500, 'DATABASE_ERROR');
    }
  }

  // Get all leads with filters and pagination
  async findAll(filters = {}, page = 1, limit = 20, populate = false) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.source) query.source = filters.source;
      if (filters.priority) query.priority = filters.priority;
      if (filters.assignedTo) query.assignedTo = filters.assignedTo;
      if (filters.perkId) query.perkId = filters.perkId;
      if (filters.categoryId) query.categoryId = filters.categoryId;
      
      // Date range filters
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }
      
      // Lead score range
      if (filters.minScore !== undefined) {
        query.leadScore = query.leadScore || {};
        query.leadScore.$gte = filters.minScore;
      }
      if (filters.maxScore !== undefined) {
        query.leadScore = query.leadScore || {};
        query.leadScore.$lte = filters.maxScore;
      }
      
      // Location filters
      if (filters.country) query['location.country'] = filters.country;
      if (filters.city) query['location.city'] = filters.city;
      
      // Search by name, email, or company
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { 'company.name': { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      // Follow-up filters
      if (filters.needsFollowUp) {
        query.nextFollowUpAt = { $lte: new Date() };
        query.status = { $nin: ['converted', 'closed'] };
      }

      const skip = (page - 1) * limit;
      
      let baseQuery = Lead.find(query);
      
      if (populate) {
        baseQuery = baseQuery
          .populate('perkId', 'title slug vendor.name')
          .populate('categoryId', 'name slug')
          .populate('assignedTo', 'name email')
          .populate('updatedBy', 'name email');
      }
      
      // Determine sort order
      let sortOptions = { createdAt: -1 }; // Default sort
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'score':
            sortOptions = { leadScore: -1, createdAt: -1 };
            break;
          case 'name':
            sortOptions = { name: 1 };
            break;
          case 'status':
            sortOptions = { status: 1, createdAt: -1 };
            break;
          case 'followUp':
            sortOptions = { nextFollowUpAt: 1, createdAt: -1 };
            break;
        }
      }
      
      const [leads, total] = await Promise.all([
        baseQuery
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Lead.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(leads, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching leads', 500, 'DATABASE_ERROR');
    }
  }

  // Update lead
  async update(id, updateData) {
    try {
      const lead = await Lead.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while updating lead', 500, 'DATABASE_ERROR');
    }
  }

  // Delete lead
  async delete(id) {
    try {
      const lead = await Lead.findByIdAndDelete(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      return lead;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting lead', 500, 'DATABASE_ERROR');
    }
  }

  // Add note to lead
  async addNote(id, noteData) {
    try {
      const lead = await Lead.findById(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      await lead.addNote(noteData.content, noteData.addedBy, noteData.type);
      return await this.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while adding note', 500, 'DATABASE_ERROR');
    }
  }

  // Assign lead to user
  async assignLead(id, userId) {
    try {
      const lead = await Lead.findById(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      await lead.assignTo(userId);
      return await this.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while assigning lead', 500, 'DATABASE_ERROR');
    }
  }

  // Update lead status
  async updateStatus(id, status, updatedBy) {
    try {
      const lead = await Lead.findById(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      await lead.updateStatus(status, updatedBy);
      return await this.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while updating status', 500, 'DATABASE_ERROR');
    }
  }

  // Schedule follow-up
  async scheduleFollowUp(id, followUpDate, updatedBy) {
    try {
      const lead = await Lead.findById(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      await lead.scheduleFollowUp(followUpDate, updatedBy);
      return await this.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while scheduling follow-up', 500, 'DATABASE_ERROR');
    }
  }

  // Record contact attempt
  async recordContactAttempt(id, updatedBy, notes) {
    try {
      const lead = await Lead.findById(id);
      
      if (!lead) {
        throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
      }
      
      await lead.recordContactAttempt(updatedBy, notes);
      return await this.findById(id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while recording contact attempt', 500, 'DATABASE_ERROR');
    }
  }

  // Search leads
  async search(query, options = {}) {
    try {
      return await Lead.searchLeads(query, options);
    } catch (error) {
      throw new AppError('Database error while searching leads', 500, 'DATABASE_ERROR');
    }
  }

  // Get lead statistics
  async getStats(dateRange = {}) {
    try {
      return await Lead.getLeadStats(dateRange);
    } catch (error) {
      throw new AppError('Database error while getting lead stats', 500, 'DATABASE_ERROR');
    }
  }

  // Get conversion funnel
  async getConversionFunnel(dateRange = {}) {
    try {
      return await Lead.getConversionFunnel(dateRange);
    } catch (error) {
      throw new AppError('Database error while getting conversion funnel', 500, 'DATABASE_ERROR');
    }
  }

  // Get lead sources
  async getLeadSources(dateRange = {}) {
    try {
      return await Lead.getLeadSources(dateRange);
    } catch (error) {
      throw new AppError('Database error while getting lead sources', 500, 'DATABASE_ERROR');
    }
  }

  // Get leads by status
  async getLeadsByStatus(status, page = 1, limit = 20) {
    try {
      return await this.findAll({ status }, page, limit, true);
    } catch (error) {
      throw error;
    }
  }

  // Get leads needing follow-up
  async getLeadsNeedingFollowUp(page = 1, limit = 20) {
    try {
      return await this.findAll({ needsFollowUp: true }, page, limit, true);
    } catch (error) {
      throw error;
    }
  }

  // Get leads by assigned user
  async getLeadsByAssignee(userId, page = 1, limit = 20) {
    try {
      return await this.findAll({ assignedTo: userId }, page, limit, true);
    } catch (error) {
      throw error;
    }
  }

  // Get recent leads
  async getRecentLeads(days = 7, limit = 20) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      
      return await this.findAll({ dateFrom }, 1, limit, true);
    } catch (error) {
      throw error;
    }
  }

  // Get high-value leads (by score)
  async getHighValueLeads(minScore = 70, page = 1, limit = 20) {
    try {
      return await this.findAll({ minScore }, page, limit, true);
    } catch (error) {
      throw error;
    }
  }

  // Bulk update leads
  async bulkUpdate(updates) {
    try {
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: { _id: update.id },
          update: { ...update.data, updatedAt: new Date() }
        }
      }));
      
      return await Lead.bulkWrite(bulkOps);
    } catch (error) {
      throw new AppError('Database error during bulk update', 500, 'DATABASE_ERROR');
    }
  }

  // Get lead analytics by date range
  async getAnalytics(dateRange = {}) {
    try {
      const matchStage = {};
      
      if (dateRange.start || dateRange.end) {
        matchStage.createdAt = {};
        if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
      }
      
      const analytics = await Lead.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
            avgScore: { $avg: '$leadScore' },
            totalValue: { $sum: '$conversionValue' }
          }
        },
        {
          $addFields: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            conversionRate: {
              $cond: [
                { $gt: ['$count', 0] },
                { $multiply: [{ $divide: ['$converted', '$count'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      return analytics;
    } catch (error) {
      throw new AppError('Database error while getting analytics', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new LeadRepository();