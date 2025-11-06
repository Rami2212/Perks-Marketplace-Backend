// controllers/blogCategoryController.js

const blogCategoryService = require('../services/blogCategoryService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

class BlogCategoryController {
  // Single file upload middleware
  uploadSingle = upload.single('image');

  // Create new blog category
  createCategory = catchAsync(async (req, res) => {
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

    const category = await blogCategoryService.createCategory(
      req.body,
      req.user.id,
      req.file
    );

    res.status(201).json({
      success: true,
      data: category,
      message: 'Blog category created successfully'
    });
  });

  // Get all blog categories (Admin)
  getCategories = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      isVisible,
      showInMenu,
      isFeatured,
      includeRelations = false
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
      showInMenu: showInMenu !== undefined ? showInMenu === 'true' : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      includeRelations: includeRelations === 'true'
    };

    const result = await blogCategoryService.getCategories(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get blog categories for public access
  getCategoriesPublic = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search,
      showInMenu,
      isFeatured,
      includeRelations = false
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status: 'active',
      isVisible: true,
      search,
      showInMenu: showInMenu !== undefined ? showInMenu === 'true' : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      includeRelations: includeRelations === 'true'
    };

    const result = await blogCategoryService.getCategories(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get blog category by ID
  getCategoryById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const category = await blogCategoryService.getCategoryById(id, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: category
    });
  });

  // Get blog category by slug
  getCategoryBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeRelations = false } = req.query;

    const category = await blogCategoryService.getCategoryBySlug(slug, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: category
    });
  });

  // Update blog category
  updateCategory = catchAsync(async (req, res) => {
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
    const updatedCategory = await blogCategoryService.updateCategory(
      id,
      req.body,
      req.user.id,
      req.file
    );

    res.status(200).json({
      success: true,
      data: updatedCategory,
      message: 'Blog category updated successfully'
    });
  });

  // Delete blog category
  deleteCategory = catchAsync(async (req, res) => {
    const { id } = req.params;

    await blogCategoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message: 'Blog category deleted successfully'
    });
  });

  // Get featured blog categories
  getFeaturedCategories = catchAsync(async (req, res) => {
    const { limit = 6 } = req.query;

    const categories = await blogCategoryService.getFeaturedCategories(parseInt(limit));

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Search blog categories
  searchCategories = catchAsync(async (req, res) => {
    const { q: query, page = 1, limit = 20, status = 'active' } = req.query;

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
      status
    };

    const result = await blogCategoryService.searchCategories(query, options);

    res.status(200).json({
      success: true,
      data: result.categories,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Get menu blog categories
  getMenuCategories = catchAsync(async (req, res) => {
    const categories = await blogCategoryService.getMenuCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Upload blog category image
  uploadCategoryImage = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        }
      });
    }

    const updatedCategory = await blogCategoryService.updateCategory(
      id,
      {},
      req.user.id,
      req.file
    );

    res.status(200).json({
      success: true,
      data: {
        category: updatedCategory,
        image: updatedCategory.image
      },
      message: 'Blog category image uploaded successfully'
    });
  });

  // Validate slug
  validateSlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { excludeId } = req.query;

    const validation = await blogCategoryService.validateSlug(slug, excludeId);

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

    const { name } = req.body;
    const { excludeId } = req.query;

    const slug = await blogCategoryService.generateUniqueSlug(name, excludeId);

    res.status(200).json({
      success: true,
      data: { slug }
    });
  });

  // Update blog category counters
  updateCategoryCounters = catchAsync(async (req, res) => {
    const { id } = req.params;

    const category = await blogCategoryService.updateCategoryCounters(id);

    res.status(200).json({
      success: true,
      data: category,
      message: 'Blog category counters updated successfully'
    });
  });
}

module.exports = new BlogCategoryController();