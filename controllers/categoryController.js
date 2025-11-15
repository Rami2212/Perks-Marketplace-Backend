const categoryService = require('../services/categoryService');
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

class CategoryController {
  // Single file upload middleware
  uploadSingle = upload.single('image');

  // Create new category
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

    const category = await categoryService.createCategory(
      req.body,
      req.user.id,
      req.file
    );

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  });

  // Get all categories
  getCategories = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      level,
      parentId,
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
      level: level !== undefined ? parseInt(level) : undefined,
      parentId: parentId === 'null' ? null : parentId,
      search,
      isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
      showInMenu: showInMenu !== undefined ? showInMenu === 'true' : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      includeRelations: includeRelations === 'true'
    };

    const result = await categoryService.getCategories(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get categories for public access
  getCategoriesPublic = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      level,
      parentId,
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
      level: level !== undefined ? parseInt(level) : undefined,
      parentId: parentId === 'null' ? null : parentId,
      search,
      showInMenu: showInMenu !== undefined ? showInMenu === 'true' : undefined,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      includeRelations: includeRelations === 'true'
    };

    const result = await categoryService.getCategories(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });


  // Get category tree
  getCategoryTree = catchAsync(async (req, res) => {
    const { maxDepth = 3 } = req.query;

    const tree = await categoryService.getCategoryTree(parseInt(maxDepth));

    res.status(200).json({
      success: true,
      data: tree
    });
  });

  // Get category by ID
  getCategoryById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const category = await categoryService.getCategoryById(id, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: category
    });
  });

  // Get category by ID for public access
  getCategoryByIdPublic = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const category = await categoryService.getCategoryById(id, includeRelations === 'true');

    // Check if category exists and is public
    if (!category || category.status !== 'active' || category.isVisible !== true) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found or not available for public access'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  });


  // Get category by slug
  getCategoryBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeRelations = false } = req.query;

    const category = await categoryService.getCategoryBySlug(slug, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: category
    });
  });

  // Update category
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
    const updatedCategory = await categoryService.updateCategory(
      id,
      req.body,
      req.user.id,
      req.file
    );

    res.status(200).json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
  });

  // Delete category
  deleteCategory = catchAsync(async (req, res) => {
    const { id } = req.params;

    await categoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  });

  // Get root categories
  getRootCategories = catchAsync(async (req, res) => {
    const { includeInactive = false } = req.query;

    const categories = await categoryService.getRootCategories(includeInactive === 'true');

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Get subcategories
  getSubcategories = catchAsync(async (req, res) => {
    const { parentId } = req.params;
    const { includeInactive = false } = req.query;

    const subcategories = await categoryService.getSubcategories(parentId, includeInactive === 'true');

    res.status(200).json({
      success: true,
      data: subcategories
    });
  });

  // Get featured categories
  getFeaturedCategories = catchAsync(async (req, res) => {
    const { limit = 6 } = req.query;

    const categories = await categoryService.getFeaturedCategories(parseInt(limit));

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Get category breadcrumb
  getCategoryBreadcrumb = catchAsync(async (req, res) => {
    const { id } = req.params;

    const breadcrumb = await categoryService.getCategoryBreadcrumb(id);

    res.status(200).json({
      success: true,
      data: breadcrumb
    });
  });

  // Search categories
  searchCategories = catchAsync(async (req, res) => {
    const { q: query, page = 1, limit = 20, status = 'active', level, parentId } = req.query;

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
      level: level !== undefined ? parseInt(level) : undefined,
      parentId: parentId === 'null' ? null : parentId
    };

    const result = await categoryService.searchCategories(query, options);

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

  // Track category view
  trackCategoryView = catchAsync(async (req, res) => {
    const { id } = req.params;

    await categoryService.trackCategoryView(id, req.user?.clientId, req.user?.id);

    res.status(200).json({
      success: true,
      message: 'Category view tracked successfully'
    });
  });

  // Get menu categories
  getMenuCategories = catchAsync(async (req, res) => {
    const categories = await categoryService.getMenuCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Get filter categories
  getFilterCategories = catchAsync(async (req, res) => {
    const categories = await categoryService.getFilterCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  });

  // Upload category image
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

    const updatedCategory = await categoryService.updateCategory(
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
      message: 'Category image uploaded successfully'
    });
  });

  // Validate slug
  validateSlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { excludeId } = req.query;

    const validation = await categoryService.validateSlug(slug, excludeId);

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

    const slug = await categoryService.generateUniqueSlug(name, excludeId);

    res.status(200).json({
      success: true,
      data: { slug }
    });
  });

  // Update category counters
  updateCategoryCounters = catchAsync(async (req, res) => {
    const { id } = req.params;

    const category = await categoryService.updateCategoryCounters(id);

    res.status(200).json({
      success: true,
      data: category,
      message: 'Category counters updated successfully'
    });
  });

  // Update category status
  updateCategoryStatus = catchAsync(async (req, res) => {
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

    const updatedCategory = await categoryService.updateCategoryStatus(id, status);

    res.status(200).json({
      success: true,
      data: updatedCategory,
      message: 'Category status updated successfully'
    });
  });
}

module.exports = new CategoryController();