const perkRepository = require('../repositories/perkRepository');
const categoryRepository = require('../repositories/categoryRepository');
const uploadService = require('./uploadService');
const slugifyUtils = require('../utils/slugify');
const { AppError } = require('../middleware/errorHandler');
const analyticsService = require('./analyticsService');

class PerkService {
  // Create new perk (Admin/Client)
  async createPerk(perkData, userId, imageFiles = {}) {
    try {
      // Validate category exists
      if (perkData.categoryId) {
        const category = await categoryRepository.findById(perkData.categoryId);
        if (!category) {
          throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }
      }

      // Handle image uploads
      if (imageFiles.mainImage) {
        const mainImageData = await this.processImageUpload(imageFiles.mainImage);
        perkData.images = { main: mainImageData };
      }

      if (!perkData.vendor) {
        perkData.vendor = {};
      }

      if (imageFiles.vendorLogo) {
        const logoData = await this.processImageUpload(imageFiles.vendorLogo);
        perkData.vendor.logo = logoData;
      }

      if (imageFiles.gallery && imageFiles.gallery.length > 0) {
        const galleryData = await Promise.all(
          imageFiles.gallery.map(file => this.processImageUpload(file))
        );
        if (!perkData.images) perkData.images = {};
        perkData.images.gallery = galleryData;
      }

      // Set audit fields
      perkData.createdBy = userId;
      perkData.updatedBy = userId;

      // Set client ID if not admin creating for client
      if (!perkData.clientId) {
        perkData.clientId = userId;
      }

      const perk = await perkRepository.create(perkData);

      // Update category counters
      if (perk.categoryId) {
        await categoryRepository.updateCounters(perk.categoryId);
      }

      return await perkRepository.findById(perk._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create perk', 500, 'CREATE_PERK_ERROR');
    }
  }

  // Process image upload
  async processImageUpload(imageFile) {
    try {
      const validation = uploadService.validateFile(imageFile, 5242880, ['image/jpeg', 'image/png', 'image/webp']);
      if (!validation.valid) {
        throw new AppError(`Image validation failed: ${validation.errors.join(', ')}`, 400, 'INVALID_IMAGE');
      }

      const uploadResult = await uploadService.processSingleUpload(imageFile, 'perks', 'medium');

      if (!uploadResult.success) {
        throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
      }

      const { url, publicId, format, width, height, size, uploadedAt } = uploadResult.data;
      const thumbnailResult = uploadService.generateThumbnail(publicId, 300, 300);

      // Delete temp file
      // if (imageFile.path) {
      //   fs.unlink(imageFile.path, (err) => {
      //     if (err) console.error('Failed to delete temp file:', err);
      //   });
      // }

      return {
        url,
        publicId,
        thumbnailUrl: thumbnailResult.data.url,
        uploadedAt: new Date(uploadedAt)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to process image upload', 500, 'IMAGE_PROCESSING_ERROR');
    }
  }

  // Get perk by ID
  async getPerkById(id, includeRelations = false) {
    try {
      const perk = await perkRepository.findById(id, includeRelations);

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get perk', 500, 'GET_PERK_ERROR');
    }
  }

  // Get perk by ID (Public)
  async getPerkByIdPublic(id, includeRelations = false) {
    try {
      const perk = await perkRepository.findById(id, includeRelations);
      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }
      // Only return if perk is active and visible for public access
      if (perk.status !== 'active' || !perk.isVisible) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }
      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get perk by ID', 500, 'GET_PERK_ERROR');
    }
  }

  // Get perk by slug (Public)
  async getPerkBySlug(slug, includeRelations = false) {
    try {
      const perk = await perkRepository.findBySlug(slug, includeRelations);

      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      // Only return if perk is active and visible for public access
      if (perk.status !== 'active' || !perk.isVisible) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      return perk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get perk by slug', 500, 'GET_PERK_ERROR');
    }
  }

  // Get all perks (Admin)
  async getPerks(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        categoryId,
        clientId,
        isVisible,
        isFeatured,
        isExclusive,
        approvalStatus,
        vendorEmail,
        dateFrom,
        dateTo,
        search,
        tags,
        sortBy,
        includeRelations = false
      } = options;

      const filters = {};
      if (status) filters.status = status;
      if (categoryId) filters.categoryId = categoryId;
      if (clientId) filters.clientId = clientId;
      if (isVisible !== undefined) filters.isVisible = isVisible;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured;
      if (isExclusive !== undefined) filters.isExclusive = isExclusive;
      if (approvalStatus) filters.approvalStatus = approvalStatus;
      if (vendorEmail) filters.vendorEmail = vendorEmail;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (search) filters.search = search;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (sortBy) filters.sortBy = sortBy;

      return await perkRepository.findAll(filters, page, limit, includeRelations);
    } catch (error) {
      throw new AppError('Failed to get perks', 500, 'GET_PERKS_ERROR');
    }
  }

  // Get active perks (Public)
  async getActivePerks(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        tags,
        isFeatured,
        isExclusive,
        vendorEmail
      } = options;

      const filters = {};
      if (categoryId) filters.categoryId = categoryId;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (isFeatured !== undefined) filters.isFeatured = isFeatured;
      if (isExclusive !== undefined) filters.isExclusive = isExclusive;
      if (vendorEmail) filters.vendorEmail = vendorEmail;

      return await perkRepository.findActivePerks(filters, page, limit);
    } catch (error) {
      throw new AppError('Failed to get active perks', 500, 'GET_ACTIVE_PERKS_ERROR');
    }
  }

  // Get featured perks (Public)
  async getFeaturedPerks(limit = 10, categoryId = null) {
    try {
      return await perkRepository.getFeaturedPerks(limit, categoryId);
    } catch (error) {
      throw new AppError('Failed to get featured perks', 500, 'GET_FEATURED_PERKS_ERROR');
    }
  }

  // Get perks by client ID (Client)
  async getClientPerks(clientId, page = 1, limit = 20) {
    try {
      return await perkRepository.findByClientId(clientId, page, limit, true);
    } catch (error) {
      throw new AppError('Failed to get client perks', 500, 'GET_CLIENT_PERKS_ERROR');
    }
  }

  // Get perks by category (Public)
  async getPerksByCategory(categoryId, page = 1, limit = 20) {
    try {
      return await perkRepository.findByCategoryId(categoryId, page, limit, true);
    } catch (error) {
      throw new AppError('Failed to get perks by category', 500, 'GET_PERKS_BY_CATEGORY_ERROR');
    }
  }

  // Update perk (Admin/Client)
  async updatePerk(id, updateData, userId, imageFiles = {}) {
    try {
      const perk = await perkRepository.findById(id);
      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      //Handle image uploads and replacements
      if (imageFiles.mainImage) {
        // Delete old main image
        if (perk.images?.main?.publicId) {
          try {
            await uploadService.deleteSingleImage(perk.images.main.publicId);
          } catch (error) {
            console.warn('Failed to delete old main image:', error.message);
          }
        }

        const mainImageData = await this.processImageUpload(imageFiles.mainImage);
        updateData.images = { ...updateData.images, main: mainImageData };
      }

      if (!updateData.vendor) {
        updateData.vendor = {};
      }

      if (imageFiles.vendorLogo) {
        // Delete old vendor logo
        if (perk.vendor?.logo?.publicId) {
          try {
            await uploadService.deleteSingleImage(perk.vendor.logo.publicId);
          } catch (error) {
            console.warn('Failed to delete old vendor logo:', error.message);
          }
        }

        const logoData = await this.processImageUpload(imageFiles.vendorLogo);
        updateData.vendor = { ...updateData.vendor, logo: logoData };
      }

      // Set updater
      updateData.updatedBy = userId;

      const updatedPerk = await perkRepository.update(id, updateData);

      // Update category counters if category changed
      if (updateData.categoryId && updateData.categoryId !== perk.categoryId) {
        if (perk.categoryId) {
          await categoryRepository.updateCounters(perk.categoryId);
        }
        await categoryRepository.updateCounters(updateData.categoryId);
      }

      return await perkRepository.findById(updatedPerk._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update perk', 500, 'UPDATE_PERK_ERROR');
    }
  }

  // Update perk SEO (Client only)
  async updatePerkSEO(id, seoData, clientId) {
    try {
      return await perkRepository.updateSEO(id, seoData, clientId);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update perk SEO', 500, 'UPDATE_SEO_ERROR');
    }
  }

  // Delete perk (Admin/Client)
  async deletePerk(id, userId) {
    try {
      const perk = await perkRepository.findById(id);
      if (!perk) {
        throw new AppError('Perk not found', 404, 'PERK_NOT_FOUND');
      }

      // Delete associated images
      const imagesToDelete = [];

      if (perk.images?.main?.publicId) {
        imagesToDelete.push(perk.images.main.publicId);
      }

      if (perk.vendor?.logo?.publicId) {
        imagesToDelete.push(perk.vendor.logo.publicId);
      }

      if (perk.images?.gallery) {
        perk.images.gallery.forEach(img => {
          if (img.publicId) imagesToDelete.push(img.publicId);
        });
      }

      // Delete images from Cloudinary
      if (imagesToDelete.length > 0) {
        try {
          await uploadService.deleteMultipleImages(imagesToDelete);
        } catch (error) {
          console.warn('Failed to delete perk images:', error.message);
        }
      }

      const deletedPerk = await perkRepository.delete(id);

      // Update category counters
      if (deletedPerk.categoryId) {
        await categoryRepository.updateCounters(deletedPerk.categoryId);
      }

      return deletedPerk;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete perk', 500, 'DELETE_PERK_ERROR');
    }
  }

  // Search perks (Public)
  async searchPerks(query, options = {}, clientId = null, userId = null) {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
      }

      const result = await perkRepository.search(query.trim(), options);

      // Track search event
      // if (analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('SEARCH_PERFORMED', {
      //     query: query.trim(),
      //     resultsCount: result.total || 0,
      //     type: 'perks'
      //   }, {
      //     clientId,
      //     userId
      //   });
      // }

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search perks', 500, 'SEARCH_PERKS_ERROR');
    }
  }

  // Approve perk (Admin)
  async approvePerk(id, reviewerId, notes = null) {
    try {
      return await perkRepository.approvePerk(id, reviewerId, notes);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to approve perk', 500, 'APPROVE_PERK_ERROR');
    }
  }

  // Reject perk (Admin)
  async rejectPerk(id, reviewerId, reason, notes = null) {
    try {
      return await perkRepository.rejectPerk(id, reviewerId, reason, notes);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to reject perk', 500, 'REJECT_PERK_ERROR');
    }
  }

  // Track perk view
  async trackView(id, clientId = null, userId = null) {
    try {
      const perk = await perkRepository.incrementViewCount(id);

      // if (perk && analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('PERK_VIEW', {
      //     perkId: id,
      //     title: perk.title,
      //     category: perk.categoryId?.name,
      //     vendor: perk.vendor?.name,
      //     value: perk.discountedPrice?.amount || perk.originalPrice?.amount || 0,
      //     type: 'perk_view'
      //   }, {
      //     clientId,
      //     userId
      //   });
      // }

      return perk;
    } catch (error) {
      console.warn('Failed to track view for perk:', id, error.message);
      return null;
    }
  }

  // Track perk click
  async trackClick(id, clickType = 'cta_button', clientId = null, userId = null) {
    try {
      const perk = await perkRepository.incrementClickCount(id);

      // if (perk && analyticsService.isConfigured()) {
      //   await analyticsService.trackEvent('PERK_CLICK', {
      //     perkId: id,
      //     title: perk.title,
      //     category: perk.categoryId?.name,
      //     vendor: perk.vendor?.name,
      //     clickType,
      //     value: perk.discountedPrice?.amount || perk.originalPrice?.amount || 0
      //   }, {
      //     clientId,
      //     userId
      //   });
      // }

      return perk;
    } catch (error) {
      console.warn('Failed to track click for perk:', id, error.message);
      return null;
    }
  }

  // Track perk share
  async trackShare(id, shareMethod, clientId = null, userId = null) {
    try {
      const perk = await perkRepository.findById(id);

      if (perk && analyticsService.isConfigured()) {
        await analyticsService.trackEvent('PERK_SHARE', {
          perkId: id,
          title: perk.title,
          shareMethod,
          category: perk.categoryId?.name,
          vendor: perk.vendor?.name
        }, {
          clientId,
          userId
        });
      }

      return perk;
    } catch (error) {
      console.warn('Failed to track share for perk:', id, error.message);
      return null;
    }
  }

  // Get perk statistics (Admin)
  async getPerkStats(dateRange = {}) {
    try {
      return await perkRepository.getStats(dateRange);
    } catch (error) {
      throw new AppError('Failed to get perk statistics', 500, 'GET_STATS_ERROR');
    }
  }

  // Validate perk slug
  async validateSlug(slug, excludeId = null) {
    try {
      const exists = await perkRepository.slugExists(slug, excludeId);
      return { isValid: !exists, exists };
    } catch (error) {
      throw new AppError('Failed to validate slug', 500, 'VALIDATE_SLUG_ERROR');
    }
  }

  // Generate unique slug
  async generateUniqueSlug(title, excludeId = null) {
    try {
      const baseSlug = slugifyUtils.createSeoSlug(title);
      let slug = baseSlug;
      let counter = 1;

      while (await perkRepository.slugExists(slug, excludeId)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      return slug;
    } catch (error) {
      throw new AppError('Failed to generate unique slug', 500, 'GENERATE_SLUG_ERROR');
    }
  }

  // Get expiring perks (Admin)
  async getExpiringSoon(days = 7) {
    try {
      return await perkRepository.getExpiringSoon(days);
    } catch (error) {
      throw new AppError('Failed to get expiring perks', 500, 'GET_EXPIRING_PERKS_ERROR');
    }
  }
}

module.exports = new PerkService();