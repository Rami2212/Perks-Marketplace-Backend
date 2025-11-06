// repositories/blogRepository.js

const BlogPost = require('../models/BlogPost');
const { AppError } = require('../middleware/errorHandler');
const paginationUtils = require('../utils/pagination');

class BlogRepository {
  // Create new blog post
  async create(postData) {
    try {
      const post = new BlogPost(postData);
      return await post.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Blog post slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while creating blog post', 500, 'DATABASE_ERROR');
    }
  }

  // Find blog post by ID
  async findById(id, populate = false) {
    try {
      let query = BlogPost.findById(id);

      if (populate) {
        query = query
          .populate('categoryId', 'name slug')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding blog post', 500, 'DATABASE_ERROR');
    }
  }

  // Find blog post by slug
  async findBySlug(slug, populate = false) {
    try {
      let query = BlogPost.findOne({ slug });

      if (populate) {
        query = query
          .populate('categoryId', 'name slug');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding blog post by slug', 500, 'DATABASE_ERROR');
    }
  }

  // Get all blog posts with filters and pagination
  async findAll(filters = {}, page = 1, limit = 20, populate = false) {
    try {
      const query = {};

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.categoryId) query.categoryId = filters.categoryId;
      if (filters.isVisible !== undefined) query.isVisible = filters.isVisible;
      if (filters.createdBy) query.createdBy = filters.createdBy;

      // Date range filters
      if (filters.dateFrom || filters.dateTo) {
        query.publishedAt = {};
        if (filters.dateFrom) query.publishedAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.publishedAt.$lte = new Date(filters.dateTo);
      }

      // Search by title, excerpt, or content
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { excerpt: { $regex: filters.search, $options: 'i' } },
          { content: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const skip = (page - 1) * limit;

      let baseQuery = BlogPost.find(query);

      if (populate) {
        baseQuery = baseQuery
          .populate('categoryId', 'name slug')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      // Determine sort order
      let sortOptions = { publishedAt: -1, createdAt: -1 };
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'title':
            sortOptions = { title: 1 };
            break;
          case 'views_desc':
            sortOptions = { 'analytics.viewCount': -1 };
            break;
          case 'oldest':
            sortOptions = { publishedAt: 1 };
            break;
          case 'newest':
            sortOptions = { publishedAt: -1 };
            break;
        }
      }

      const [posts, total] = await Promise.all([
        baseQuery
          .sort(sortOptions)
          .skip(skip)
          .limit(limit),
        BlogPost.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(posts, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching blog posts', 500, 'DATABASE_ERROR');
    }
  }

  // Get published blog posts (Public)
  async findPublishedPosts(filters = {}, page = 1, limit = 20) {
    try {
      return await BlogPost.getPublishedPosts(filters, page, limit);
    } catch (error) {
      throw new AppError('Database error while fetching published blog posts', 500, 'DATABASE_ERROR');
    }
  }

  // Get blog posts by category
  async findByCategoryId(categoryId, page = 1, limit = 20, publishedOnly = true) {
    try {
      const query = { categoryId };

      if (publishedOnly) {
        query.status = 'published';
        query.isVisible = true;
        query.publishedAt = { $lte: new Date() };
      }

      const skip = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        BlogPost.find(query)
          .populate('categoryId', 'name slug')
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(limit),
        BlogPost.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(posts, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching blog posts by category', 500, 'DATABASE_ERROR');
    }
  }

  // Get related blog posts
  async getRelatedPosts(postId, limit = 5) {
    try {
      return await BlogPost.getRelatedPosts(postId, limit);
    } catch (error) {
      throw new AppError('Database error while fetching related blog posts', 500, 'DATABASE_ERROR');
    }
  }

  // Search blog posts
  async search(searchQuery, options = {}) {
    try {
      return await BlogPost.searchPosts(searchQuery, options);
    } catch (error) {
      throw new AppError('Database error while searching blog posts', 500, 'DATABASE_ERROR');
    }
  }

  // Update blog post
  async update(id, updateData) {
    try {
      const post = await BlogPost.findById(id);
      if (!post) throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');

      // Merge updateData
      Object.keys(updateData).forEach(key => {
        if (key === 'featuredImage' || key === 'gallery' || key === 'author') {
          post[key] = { ...post[key], ...updateData[key] };
        } else {
          post[key] = updateData[key];
        }
      });

      post.updatedAt = new Date();
      await post.save();
      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError('Blog post slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while updating blog post', 500, 'DATABASE_ERROR');
    }
  }

  // Delete blog post
  async delete(id) {
    try {
      const post = await BlogPost.findByIdAndDelete(id);

      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting blog post', 500, 'DATABASE_ERROR');
    }
  }

  // Increment view count
  async incrementViewCount(id) {
    try {
      const post = await BlogPost.findById(id);
      if (post) {
        await post.incrementViewCount();
      }
      return post;
    } catch (error) {
      throw new AppError('Database error while incrementing view count', 500, 'DATABASE_ERROR');
    }
  }

  // Increment share count
  async incrementShareCount(id) {
    try {
      const post = await BlogPost.findById(id);
      if (post) {
        await post.incrementShareCount();
      }
      return post;
    } catch (error) {
      throw new AppError('Database error while incrementing share count', 500, 'DATABASE_ERROR');
    }
  }

  // Increment click count
  async incrementClickCount(id) {
    try {
      const post = await BlogPost.findById(id);
      if (post) {
        await post.incrementClickCount();
      }
      return post;
    } catch (error) {
      throw new AppError('Database error while incrementing click count', 500, 'DATABASE_ERROR');
    }
  }

  // Get blog post statistics
  async getStats(dateRange = {}) {
    try {
      const matchStage = {};

      if (dateRange.start || dateRange.end) {
        matchStage.createdAt = {};
        if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
        if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
      }

      const stats = await BlogPost.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
            totalViews: { $sum: '$analytics.viewCount' },
            totalShares: { $sum: '$analytics.shareCount' },
            totalClicks: { $sum: '$analytics.clickCount' },
            avgReadTime: { $avg: '$readTime' }
          }
        }
      ]);

      return stats[0] || {
        total: 0, published: 0, draft: 0, archived: 0,
        totalViews: 0, totalShares: 0, totalClicks: 0, avgReadTime: 0
      };
    } catch (error) {
      throw new AppError('Database error while getting blog post stats', 500, 'DATABASE_ERROR');
    }
  }

  // Check if slug exists
  async slugExists(slug, excludeId = null) {
    try {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const post = await BlogPost.findOne(query);
      return !!post;
    } catch (error) {
      throw new AppError('Database error while checking slug', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new BlogRepository();