// repositories/blogCategoryRepository.js

const BlogCategory = require('../models/BlogCategory');
const { AppError } = require('../middleware/errorHandler');
const paginationUtils = require('../utils/pagination');

class BlogCategoryRepository {
  // Create new blog category
  async create(categoryData) {
    try {
      const category = new BlogCategory(categoryData);
      return await category.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Blog category slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while creating blog category', 500, 'DATABASE_ERROR');
    }
  }

  // Find blog category by ID
  async findById(id, populate = false) {
    try {
      let query = BlogCategory.findById(id);

      if (populate) {
        query = query
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding blog category', 500, 'DATABASE_ERROR');
    }
  }

  // Find blog category by slug
  async findBySlug(slug, populate = false) {
    try {
      let query = BlogCategory.findOne({ slug });

      if (populate) {
        query = query
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      return await query;
    } catch (error) {
      throw new AppError('Database error while finding blog category by slug', 500, 'DATABASE_ERROR');
    }
  }

  // Get all blog categories with filters and pagination
  async findAll(filters = {}, page = 1, limit = 20, populate = false) {
    try {
      const query = {};

      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.isVisible !== undefined) query.isVisible = filters.isVisible;
      if (filters.showInMenu !== undefined) query.showInMenu = filters.showInMenu;
      if (filters.isFeatured !== undefined) query.isFeatured = filters.isFeatured;

      // Search by name or description
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      let baseQuery = BlogCategory.find(query);

      if (populate) {
        baseQuery = baseQuery
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }

      const [categories, total] = await Promise.all([
        baseQuery
          .sort({ displayOrder: 1, name: 1 })
          .skip(skip)
          .limit(limit),
        BlogCategory.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(categories, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching blog categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get featured blog categories
  async getFeaturedCategories(limit = 6) {
    try {
      return await BlogCategory.getFeaturedCategories(limit);
    } catch (error) {
      throw new AppError('Database error while finding featured blog categories', 500, 'DATABASE_ERROR');
    }
  }

  // Update blog category
  async update(id, updateData) {
    try {
      const category = await BlogCategory.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError('Blog category slug already exists', 409, 'SLUG_EXISTS');
      }
      throw new AppError('Database error while updating blog category', 500, 'DATABASE_ERROR');
    }
  }

  // Delete blog category
  async delete(id) {
    try {
      const category = await BlogCategory.findById(id);

      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      const BlogPost = require('../models/BlogPost');
      const posts = await BlogPost.find({ categoryId: id });
      if (posts.length > 0) {
        throw new AppError(
          'Blog category cannot be deleted because it has associated posts. Delete or reassign them first.',
          400,
          'CATEGORY_HAS_POSTS'
        );
      }

      await BlogCategory.findByIdAndDelete(id);
      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting blog category', 500, 'DATABASE_ERROR');
    }
  }

  // Search blog categories
  async search(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active'
      } = options;

      const searchQuery = {
        $text: { $search: query },
        status: status
      };

      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        BlogCategory.find(searchQuery)
          .sort({ score: { $meta: 'textScore' }, displayOrder: 1 })
          .skip(skip)
          .limit(limit),
        BlogCategory.countDocuments(searchQuery)
      ]);

      return { categories, total };
    } catch (error) {
      throw new AppError('Database error while searching blog categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get blog categories for menu
  async getMenuCategories() {
    try {
      return await BlogCategory.find({
        status: 'active',
        isVisible: true,
        showInMenu: true
      })
        .sort({ displayOrder: 1, name: 1 });
    } catch (error) {
      throw new AppError('Database error while getting menu blog categories', 500, 'DATABASE_ERROR');
    }
  }

  // Update counters
  async updateCounters(id) {
    try {
      await BlogCategory.updateCategoryCounters(id);
    } catch (error) {
      throw new AppError('Database error while updating blog category counters', 500, 'DATABASE_ERROR');
    }
  }

  // Check if slug exists
  async slugExists(slug, excludeId = null) {
    try {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const category = await BlogCategory.findOne(query);
      return !!category;
    } catch (error) {
      throw new AppError('Database error while checking slug', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new BlogCategoryRepository();