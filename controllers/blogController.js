// controllers/blogController.js

const blogService = require('../services/blogService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

class BlogController {
  // File upload middleware
  uploadFiles = upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'authorLogo', maxCount: 1 },
    { name: 'gallery', maxCount: 8 }
  ]);

  // Create new blog post (Admin)
  createPost = catchAsync(async (req, res) => {
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
      if (req.files.featuredImage) imageFiles.featuredImage = req.files.featuredImage[0];
      if (req.files.authorLogo) imageFiles.authorLogo = req.files.authorLogo[0];
      if (req.files.gallery) imageFiles.gallery = req.files.gallery;
    }

    const post = await blogService.createPost(req.body, req.user.id, imageFiles);

    res.status(201).json({
      success: true,
      data: post,
      message: 'Blog post created successfully'
    });
  });

  // Get all blog posts (Admin)
  getPosts = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      categoryId,
      isVisible,
      createdBy,
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
      isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
      createdBy,
      dateFrom,
      dateTo,
      search,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      sortBy,
      includeRelations: includeRelations === 'true'
    };

    const result = await blogService.getPosts(options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: result.meta
    });
  });

  // Get published blog posts (Public)
  getPublishedPosts = catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      categoryId,
      tags
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      categoryId,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined
    };

    const result = await blogService.getPublishedPosts(options);

    res.status(200).json({
      success: true,
      data: result.posts,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Get blog post by ID (Admin)
  getPostById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { includeRelations = false } = req.query;

    const post = await blogService.getPostById(id, includeRelations === 'true');

    res.status(200).json({
      success: true,
      data: post
    });
  });

  // Get blog post by slug (Public)
  getPostBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { includeRelations = false } = req.query;

    const post = await blogService.getPostBySlug(slug, includeRelations === 'true');

    // Get related posts
    const relatedPosts = await blogService.getRelatedPosts(post._id, 5);

    // Track view (don't await to avoid slowing response)
    blogService.trackView(post._id, {
      sessionId: req.sessionID,
      source: {
        referrer: req.get('Referer'),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      },
      pageUrl: req.originalUrl
    });

    res.status(200).json({
      success: true,
      data: {
        ...post.toObject(),
        relatedPosts
      }
    });
  });

  // Get blog posts by category (Public)
  getPostsByCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await blogService.getPostsByCategory(categoryId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  // Update blog post (Admin)
  updatePost = catchAsync(async (req, res) => {
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
      if (req.files.featuredImage) imageFiles.featuredImage = req.files.featuredImage[0];
      if (req.files.authorLogo) imageFiles.authorLogo = req.files.authorLogo[0];
      if (req.files.gallery) imageFiles.gallery = req.files.gallery;
    }

    const updatedPost = await blogService.updatePost(id, req.body, req.user.id, imageFiles);

    res.status(200).json({
      success: true,
      data: updatedPost,
      message: 'Blog post updated successfully'
    });
  });

  // Delete blog post (Admin)
  deletePost = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    await blogService.deletePost(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  });

  // Search blog posts (Public)
  searchPosts = catchAsync(async (req, res) => {
    const { q: query, page = 1, limit = 20, categoryId, status = 'published' } = req.query;

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

    const result = await blogService.searchPosts(query, options);

    res.status(200).json({
      success: true,
      data: result.posts,
      pagination: {
        currentPage: options.page,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / options.limit),
        itemsPerPage: options.limit
      }
    });
  });

  // Track blog post share (Public)
  trackShare = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Track share (don't await to avoid slowing response)
    blogService.trackShare(id, {
      sessionId: req.sessionID,
      source: {
        referrer: req.get('Referer'),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      },
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Share tracked'
    });
  });

  // Track blog post click (Public)
  trackClick = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Track click (don't await to avoid slowing response)
    blogService.trackClick(id, {
      sessionId: req.sessionID,
      source: {
        referrer: req.get('Referer'),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      },
      elementId: req.body.elementId,
      metadata: req.body
    });

    res.status(200).json({
      success: true,
      message: 'Click tracked'
    });
  });

  // Get blog post statistics (Admin)
  getPostStats = catchAsync(async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    
    const dateRange = {};
    if (dateFrom) dateRange.start = dateFrom;
    if (dateTo) dateRange.end = dateTo;

    const stats = await blogService.getPostStats(dateRange);

    res.status(200).json({
      success: true,
      data: stats
    });
  });

  // Validate slug
  validateSlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { excludeId } = req.query;

    const validation = await blogService.validateSlug(slug, excludeId);

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

    const slug = await blogService.generateUniqueSlug(title, excludeId);

    res.status(200).json({
      success: true,
      data: { slug }
    });
  });

  // Remove gallery image
  removeGalleryImage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PUBLIC_ID',
          message: 'Image public ID is required'
        }
      });
    }

    const updatedPost = await blogService.removeGalleryImage(id, publicId, req.user.id);

    res.status(200).json({
      success: true,
      data: updatedPost,
      message: 'Gallery image removed successfully'
    });
  });
}

module.exports = new BlogController();