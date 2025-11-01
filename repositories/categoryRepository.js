const Category = require('../models/Category');
const { AppError } = require('../middleware/errorHandler');
const paginationUtils = require('../utils/pagination');

class CategoryRepository {
  // Create new category
  async create(categoryData) {
    try {
      const category = new Category(categoryData);
      return await category.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('Category slug already exists', 409, 'SLUG_EXISTS');
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new AppError('Validation error', 400, 'VALIDATION_ERROR', errors);
      }
      throw new AppError('Database error while creating category', 500, 'DATABASE_ERROR');
    }
  }

  // Find category by ID
  async findById(id, populate = false) {
    try {
      let query = Category.findById(id);
      
      if (populate) {
        query = query
          .populate('parent', 'name slug level image')
          .populate('subcategories', 'name slug perkCount displayOrder image isFeatured')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }
      
      return await query;
    } catch (error) {
      throw new AppError('Database error while finding category', 500, 'DATABASE_ERROR');
    }
  }

  // Find category by slug
  async findBySlug(slug, populate = false) {
    try {
      let query = Category.findOne({ slug });
      
      if (populate) {
        query = query
          .populate('parent', 'name slug level image')
          .populate('subcategories', 'name slug perkCount displayOrder image isFeatured')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }
      
      return await query;
    } catch (error) {
      throw new AppError('Database error while finding category by slug', 500, 'DATABASE_ERROR');
    }
  }

  // Get all categories with filters and pagination
  async findAll(filters = {}, page = 1, limit = 20, populate = false) {
    try {
      const query = {};
      
      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.level !== undefined) query.level = filters.level;
      if (filters.parentId !== undefined) query.parentId = filters.parentId;
      if (filters.isVisible !== undefined) query.isVisible = filters.isVisible;
      if (filters.showInMenu !== undefined) query.showInMenu = filters.showInMenu;
      if (filters.showInFilter !== undefined) query.showInFilter = filters.showInFilter;
      if (filters.isFeatured !== undefined) query.isFeatured = filters.isFeatured;
      
      // Search by name or description
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      
      let baseQuery = Category.find(query);
      
      if (populate) {
        baseQuery = baseQuery
          .populate('parent', 'name slug level image')
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');
      }
      
      const [categories, total] = await Promise.all([
        baseQuery
          .sort({ level: 1, displayOrder: 1, name: 1 })
          .skip(skip)
          .limit(limit),
        Category.countDocuments(query)
      ]);

      return paginationUtils.createPaginationResponse(categories, page, limit, total);
    } catch (error) {
      throw new AppError('Database error while fetching categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get category tree
  async getCategoryTree(maxDepth = 3) {
    try {
      return await Category.buildTree(null, maxDepth);
    } catch (error) {
      throw new AppError('Database error while building category tree', 500, 'DATABASE_ERROR');
    }
  }

  // Get categories by parent ID
  async findByParentId(parentId, includeInactive = false) {
    try {
      const query = { parentId };
      
      if (!includeInactive) {
        query.status = 'active';
        query.isVisible = true;
      }
      
      return await Category.find(query)
        .sort({ displayOrder: 1, name: 1 });
    } catch (error) {
      throw new AppError('Database error while finding subcategories', 500, 'DATABASE_ERROR');
    }
  }

  // Get root categories
  async getRootCategories(includeInactive = false) {
    try {
      const query = { 
        level: 0,
        parentId: null
      };
      
      if (!includeInactive) {
        query.status = 'active';
        query.isVisible = true;
      }
      
      return await Category.find(query)
        .sort({ displayOrder: 1, name: 1 });
    } catch (error) {
      throw new AppError('Database error while finding root categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get featured categories
  async getFeaturedCategories(limit = 6) {
    try {
      return await Category.getFeaturedCategories(limit);
    } catch (error) {
      throw new AppError('Database error while finding featured categories', 500, 'DATABASE_ERROR');
    }
  }

  // Update category
  async update(id, updateData) {
    try {
      const category = await Category.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }
      
      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError('Category slug already exists', 409, 'SLUG_EXISTS');
      }
      throw new AppError('Database error while updating category', 500, 'DATABASE_ERROR');
    }
  }

  // Delete category
  async delete(id) {
    try {
      const category = await Category.findById(id);
      
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }
      
      const canDelete = await category.canBeDeleted();
      if (!canDelete) {
        throw new AppError('Category cannot be deleted because it has subcategories or perks', 400, 'CATEGORY_HAS_DEPENDENCIES');
      }
      
      await Category.findByIdAndDelete(id);
      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while deleting category', 500, 'DATABASE_ERROR');
    }
  }

  // Get breadcrumb
  async getBreadcrumb(id) {
    try {
      const category = await this.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }
      
      return await category.getFullHierarchy();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Database error while getting breadcrumb', 500, 'DATABASE_ERROR');
    }
  }

  // Search categories
  async search(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        level = null,
        parentId = null
      } = options;
      
      const searchQuery = {
        $text: { $search: query },
        status: status
      };
      
      if (level !== null) searchQuery.level = level;
      if (parentId !== null) searchQuery.parentId = parentId;
      
      const skip = (page - 1) * limit;
      
      const [categories, total] = await Promise.all([
        Category.find(searchQuery)
          .populate('parent', 'name slug')
          .sort({ score: { $meta: 'textScore' }, displayOrder: 1 })
          .skip(skip)
          .limit(limit),
        Category.countDocuments(searchQuery)
      ]);
      
      return { categories, total };
    } catch (error) {
      throw new AppError('Database error while searching categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get categories for menu
  async getMenuCategories() {
    try {
      return await Category.find({
        status: 'active',
        isVisible: true,
        showInMenu: true
      })
      .populate('subcategories', 'name slug perkCount image displayOrder')
      .sort({ level: 1, displayOrder: 1, name: 1 });
    } catch (error) {
      throw new AppError('Database error while getting menu categories', 500, 'DATABASE_ERROR');
    }
  }

  // Get categories for filters
  async getFilterCategories() {
    try {
      return await Category.find({
        status: 'active',
        isVisible: true,
        showInFilter: true,
        perkCount: { $gt: 0 }
      })
      .sort({ displayOrder: 1, name: 1 });
    } catch (error) {
      throw new AppError('Database error while getting filter categories', 500, 'DATABASE_ERROR');
    }
  }

  // Update counters
  async updateCounters(id) {
    try {
      await Category.updateCategoryCounters(id);
    } catch (error) {
      throw new AppError('Database error while updating category counters', 500, 'DATABASE_ERROR');
    }
  }

  // Check if slug exists
  async slugExists(slug, excludeId = null) {
    try {
      const query = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }
      
      const category = await Category.findOne(query);
      return !!category;
    } catch (error) {
      throw new AppError('Database error while checking slug', 500, 'DATABASE_ERROR');
    }
  }
}

module.exports = new CategoryRepository();