const perkService = require('../services/perkService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');

// Simple multer configuration for handling file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'temp/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

class PerkController {
  // File upload middleware
  uploadFiles = upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'vendorLogo', maxCount: 1 },
    { name: 'gallery', maxCount: 5 }
  ]);

  // Create new perk (Admin/Client)
  createPerk = catchAsync(async (req, res) => {
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

    // Organize uploaded files
    const imageFiles = {};
    if (req.files) {
      if (req.files.mainImage) imageFiles.mainImage = req.files.mainImage[0];
      if (req.files.vendorLogo) imageFiles.vendorLogo = req.files.vendorLogo[0];
      if (req.files.gallery) imageFiles.gallery = req.files.gallery;
    }

    const perk = await perkService.createPerk(req.body, req.user.id, imageFiles);

    res.status(201).json({
      success: true,
      data: perk,
      message: 'Perk created successfully'
    });
  });

  // Get all perks (Admin)
  getPerks = catchAsync(async (req, res) => {
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
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      categoryId,
      clientId,
      isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      isExclusive: isExclusive !== undefined ? isExclusive === 'true' : undefined,
      approvalStatus,
      vendorEmail,
      dateFrom,
      dateTo,
      search,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      sortBy,
      includeRelations: includeRelations === 'true'
    };

    const result = await perkService.getPerks(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get active perks (Public)
  getActivePerks = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      categoryId,
      tags,
      isFeatured,
      isExclusive,
      vendorEmail
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      categoryId,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      isExclusive: isExclusive !== undefined ? isExclusive === 'true' : undefined,
      vendorEmail
    };

    const result = await perkService.getActivePerks(options);

    res.status(200).json({
      success: true,
      data: result.perks,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Get featured perks (Public)
  getFeaturedPerks = catchAsync(async (req, res) => {
    const { limit = 10, categoryId } = req.query;

    const perks = await perkService.getFeaturedPerks(parseInt(limit), categoryId);

    res.status(200).json({
      success: true,
      data: perks
    });
  });

  // Get perk by ID (Admin)
  getPerkById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const perk = await perkService.getPerkById(id, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: perk
    });
  });

  getPerkByIdPublic = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const perk = await perkService.getPerkByIdPublic(id, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: perk
    });
  });

  // Get perk by slug (Public)
  getPerkBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeRelations = false } = req.query;

    const perk = await perkService.getPerkBySlug(slug, includeRelations === 'true');

    // Track view (don't await to avoid slowing response)
    perkService.trackView(perk._id);

    res.status(200).json({
      success: true,
      data: perk
    });
  });

  // Get client perks (Client)
  getClientPerks = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await perkService.getClientPerks(req.user.id, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Get perks by category (Public)
  getPerksByCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await perkService.getPerksByCategory(categoryId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Update perk (Admin/Client)
  updatePerk = catchAsync(async (req, res) => {
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

    // Organize uploaded files
    const imageFiles = {};
    if (req.files) {
      if (req.files.mainImage) imageFiles.mainImage = req.files.mainImage[0];
      if (req.files.vendorLogo) imageFiles.vendorLogo = req.files.vendorLogo[0];
      if (req.files.gallery) imageFiles.gallery = req.files.gallery;
    }

    const updatedPerk = await perkService.updatePerk(id, req.body, req.user.id, imageFiles);

    res.status(200).json({
      success: true,
      data: updatedPerk,
      message: 'Perk updated successfully'
    });
  });

  // Update perk SEO (Client)
  updatePerkSEO = catchAsync(async (req, res) => {
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
    const updatedPerk = await perkService.updatePerkSEO(id, req.body, req.user.id);

    res.status(200).json({
      success: true,
      data: updatedPerk,
      message: 'Perk SEO updated successfully'
    });
  });

  // Delete perk (Admin/Client)
  deletePerk = catchAsync(async (req, res) => {
    const { id } = req.params;

    await perkService.deletePerk(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Perk deleted successfully'
    });
  });

  // Search perks (Public)
  searchPerks = catchAsync(async (req, res) => {
    const { q: query, page = 1, limit = 20, categoryId, status = 'active' } = req.query;

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
      categoryId,
      status
    };

    const result = await perkService.searchPerks(query, options);

    res.status(200).json({
      success: true,
      data: result.perks,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Approve perk (Admin)
  approvePerk = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const perk = await perkService.approvePerk(id, req.user.id, notes);

    res.status(200).json({
      success: true,
      data: perk,
      message: 'Perk approved successfully'
    });
  });

  // Reject perk (Admin)
  rejectPerk = catchAsync(async (req, res) => {
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
    const { reason, notes } = req.body;

    const perk = await perkService.rejectPerk(id, req.user.id, reason, notes);

    res.status(200).json({
      success: true,
      data: perk,
      message: 'Perk rejected successfully'
    });
  });

  // Track perk click (Public)
  trackClick = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Track click (don't await to avoid slowing response)
    perkService.trackClick(id);

    res.status(200).json({
      success: true,
      message: 'Click tracked'
    });
  });

  // Get perk statistics (Admin)
  getPerkStats = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;

    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const stats = await perkService.getPerkStats(dateRange);

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  // Get expiring perks (Admin)
  getExpiringSoon = catchAsync(async (req, res) => {
    const { days = 7 } = req.query;

    const perks = await perkService.getExpiringSoon(parseInt(days));

    res.status(200).json({
      success: true,
      data: perks
    });
  });

  // Validate slug
  validateSlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { excludeId } = req.query;

    const validation = await perkService.validateSlug(slug, excludeId);

    res.status(200).json({
      success: true,
      data: validation
    });
  });

  // Generate slug
  generateSlug = catchAsync(async (req, res) => {
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

    const { title } = req.body;
    const { excludeId } = req.query;

    const slug = await perkService.generateUniqueSlug(title, excludeId);

    res.status(200).json({
      success: true,
      data: { slug }
    });
  });
}

module.exports = new PerkController();