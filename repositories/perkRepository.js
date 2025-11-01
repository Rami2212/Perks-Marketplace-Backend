const Perk = require('../models/Perk');
const { AppError } = require('../middleware/errorHandler');
const paginationUtils = require('../utils/pagination');

class PerkRepository {
  // Create new perk
  async create(perkData) {
    try {
      const perk = new Perk(perkData);
      return await perk.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Perk slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while creating perk', 500, 'DATABASE_ERROR');
    }
  }

  // Find perk by ID
  async findById(id, populate = false) {
    try {
      let query = Perk.findById(id);

      if (populate) {
        query = query
          .populate('categoryId', 'name slug')
          .populate('clientId', 'name email')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .populate('approval.reviewedBy', 'name email')
          .populate('approval.notes.addedBy', 'name email');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding perk', 500, 'DATABASE_ERROR');
    }
  }

  // Find perk by slug
  async findBySlug(slug, populate = false) {
    try {
      let query = Perk.findOne({ slug });

      if (populate) {
        query = query
          .populate('categoryId', 'name slug')
          .populate('clientId', 'name email');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding perk by slug', 500, 'DATABASE_ERROR');
    }
  }

  // Get all perks with filters and pagination (Admin)
  async findAll(filters = {}, page = 1, limit = 20, populate = false) {
    try {
      const query = {};

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.categoryId) query.categoryId = filters.categoryId;
      if (filters.clientId) query.clientId = filters.clientId;
      if (filters.isVisible !== undefined) query.isVisible = filters.isVisible;
      if (filters.isFeatured !== undefined) query.isFeatured = filters.isFeatured;
      if (filters.isExclusive !== undefined) query.isExclusive = filters.isExclusive;
      if (filters.approvalStatus) query['approval.status'] = filters.approvalStatus;
      if (filters.vendorEmail) query['vendor.email'] = filters.vendorEmail;

      // Date range filters
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      // Search by title, description, or vendor
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { 'vendor.name': { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const skip = (page - 1) * limit;

      let baseQuery = Perk.find(query);

      if (populate) {
        baseQuery = baseQuery
          .populate('categoryId', 'name slug')
          .populate('clientId', 'name email')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      // Determine sort order
      let sortOptions = { isFeatured: -1, priority: -1, createdAt: -1 };
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'title':
            sortOptions = { title: 1 };
            break;
          case 'created_desc':
            sortOptions = { createdAt: -1 };
            break;
          case 'created_asc':
            sortOptions = { createdAt: 1 };
            break;
          case 'views_desc':
            sortOptions = { 'metrics.viewCount': -1 };
            break;
          case 'clicks_desc':
            sortOptions = { 'metrics.clickCount': -1 };
            break;
          case 'priority_desc':
            sortOptions = { priority: -1, createdAt: -1 };
            break;
        }
      }

      const [perks, total] = await Promise.all([
        baseQuery
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        Perk.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(perks, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching perks', 500, 'DATABASE_ERROR');
    }
  }

  // Get active perks (Public)
  async findActivePerks(filters = {}, page = 1, limit = 20) {
    try {
      return await Perk.getActivePerks(filters, page, limit);
    } catch (error) {
      throw new AppError('Database error while fetching active perks', 500, 'DATABASE_ERROR');
    }
  }

  // Get featured perks
  async getFeaturedPerks(limit = 10, categoryId = null) {
    try {
      return await Perk.getFeaturedPerks(limit, categoryId);
    } catch (error) {
      throw new AppError('Database error while fetching featured perks', 500, 'DATABASE_ERROR');
    }
  }

  // Get perks by client ID
  async findByClientId(clientId, page = 1, limit = 20, populate = false) {
    try {
      const query = { clientId };
      const skip = (page - 1) * limit;

      let baseQuery = Perk.find(query);

      if (populate) {
        baseQuery = baseQuery
          .populate('categoryId', 'name slug')
          .populate('approval.reviewedBy', 'name email');
      }

      const [perks, total] = await Promise.all([
        baseQuery
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Perk.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(perks, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching client perks', 500, 'DATABASE_ERROR');
    }
  }

  // Get perks by category
  async findByCategoryId(categoryId, page = 1, limit = 20, activeOnly = true) {
    try {
      const query = { categoryId };

      if (activeOnly) {
        query.status = 'active';
        query.isVisible = true;
      }

      const skip = (page - 1) * limit;

      const [perks, total] = await Promise.all([
        Perk.find(query)
          .populate('categoryId', 'name slug')
          .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Perk.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(perks, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching perks by category', 500, 'DATABASE_ERROR');
    }
  }

  // Search perks
  async search(searchQuery, options = {}) {
    try {
      return await Perk.searchPerks(searchQuery, options);
    } catch (error) {
      throw new AppError('Database error while searching perks', 500, 'DATABASE_ERROR');
    }
  }

  // Update perk
  async update(id, updateData) {
    try {
      const perk = await Perk.findById(id);
      if (!perk) throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');

      // Merge updateData manually
      if (updateData.images?.main) perk.images = { ...perk.images, main: updateData.images.main };
      if (updateData.vendor?.logo) perk.vendor = { ...perk.vendor, logo: updateData.vendor.logo };

      // Copy other top-level fields
      Object.keys(updateData).forEach(key => {
        if (!['images', 'vendor'].includes(key)) perk[key] = updateData[key];
      });

      perk.updatedAt = new Date();

      await perk.save();
      return perk;

    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError('Perk slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while updating perk', 500, 'DATABASE_ERROR');
    }
  }

  // Update perk SEO (Client access)
  async updateSEO(id, seoData, clientId) {
    try {
      const perk = await Perk.findById(id);

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      if (!perk.canEditSEO(clientId)) {
        throw new AppError('Not authorized to edit SEO for this perk', 403, 'SEO_EDIT_FORBIDDEN');
      }

      const updatedPerk = await Perk.findByIdAndUpdate(
        id,
        { seo: seoData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      return updatedPerk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while updating perk SEO', 500, 'DATABASE_ERROR');
    }
  }

  // Delete perk
  async delete(id) {
    try {
      const perk = await Perk.findByIdAndDelete(id);

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting perk', 500, 'DATABASE_ERROR');
    }
  }

  // Approve perk
  async approvePerk(id, reviewerId, notes = null) {
    try {
      const updateData = {
        'approval.status': 'approved',
        'approval.reviewedBy': reviewerId,
        'approval.reviewedAt': new Date(),
        status: 'active',
        updatedAt: new Date()
      };

      if (notes) {
        updateData.$push = {
          'approval.notes': {
            content: notes,
            addedBy: reviewerId,
            addedAt: new Date()
          }
        };
      }

      const perk = await Perk.findByIdAndUpdate(id, updateData, { new: true });

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while approving perk', 500, 'DATABASE_ERROR');
    }
  }

  // Reject perk
  async rejectPerk(id, reviewerId, reason, notes = null) {
    try {
      const updateData = {
        'approval.status': 'rejected',
        'approval.reviewedBy': reviewerId,
        'approval.reviewedAt': new Date(),
        'approval.rejectionReason': reason,
        status: 'rejected',
        updatedAt: new Date()
      };

      if (notes) {
        updateData.$push = {
          'approval.notes': {
            content: notes,
            addedBy: reviewerId,
            addedAt: new Date()
          }
        };
      }

      const perk = await Perk.findByIdAndUpdate(id, updateData, { new: true });

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while rejecting perk', 500, 'DATABASE_ERROR');
    }
  }

  // Increment view count
  async incrementViewCount(id) {
    try {
      const perk = await Perk.findById(id);
      if (perk) {
        await perk.incrementViewCount();
      }
      return perk;
    } catch (error) {
      throw new AppError('Database error while incrementing view count', 500, 'DATABASE_ERROR');
    }
  }

  // Increment click count
  async incrementClickCount(id) {
    try {
      const perk = await Perk.findById(id);
      if (perk) {
        await perk.incrementClickCount();
      }
      return perk;
    } catch (error) {
      throw new AppError('Database error while incrementing click count', 500, 'DATABASE_ERROR');
    }
  }

  // Get perk statistics
  async getStats(dateRange = {}) {
    try {
      const matchStage = {};

      if (dateRange.start || dateRange.end) {
        matchStage.createdAt = {};
        if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
      }

      const stats = await Perk.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            featured: { $sum: { $cond: ['$isFeatured', 1, 0] } },
            exclusive: { $sum: { $cond: ['$isExclusive', 1, 0] } },
            totalViews: { $sum: '$metrics.viewCount' },
            totalClicks: { $sum: '$metrics.clickCount' },
            totalRedemptions: { $sum: '$metrics.redemptionCount' },
            avgConversionRate: { $avg: '$metrics.conversionRate' }
          }
        }
      ]);

      return stats[0] || {
        total: 0, active: 0, pending: 0, rejected: 0, featured: 0, exclusive: 0,
        totalViews: 0, totalClicks: 0, totalRedemptions: 0, avgConversionRate: 0
      };
    } catch (error) {
      throw new AppError('Database error while getting perk stats', 500, 'DATABASE_ERROR');
    }
  }

  // Check if slug exists
  async slugExists(slug, excludeId = null) {
    try {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const perk = await Perk.findOne(query);
      return !!perk;
    } catch (error) {
      throw new AppError('Database error while checking slug', 500, 'DATABASE_ERROR');
    }
  }

  // Get perks expiring soon
  async getExpiringSoon(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);

      return await Perk.find({
        status: 'active',
        isVisible: true,
        $or: [
          { 'availability.endDate': { $lte: cutoffDate, $gte: new Date() } },
          { 'redemption.expiryDate': { $lte: cutoffDate, $gte: new Date() } }
        ]
      })
        .populate('categoryId', 'name slug')
        .populate('clientId', 'name email')
        .sort({ 'availability.endDate': 1, 'redemption.expiryDate': 1 });
    } catch (error) {
      throw new AppError('Database error while getting expiring perks', 500, 'DATABASE_ERROR');
    }
  }

  // Bulk update perks
  async bulkUpdate(updates) {
    try {
      const bulkOps = updates.map(update => ({
        updateOne: {
          filter: { _id: update.id },
          update: { ...update.data, updatedAt: new Date() }
        }
      }));

      return await Perk.bulkWrite(bulkOps);
    } catch (error) {
      throw new AppError('Database error during bulk update', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new PerkRepository();