const categoryRepository = require('../repositories/categoryRepository');
const uploadService = require('./uploadService');
const slugifyUtils = require('../utils/slugify');
const { AppError } = require('../middleware/errorHandler');
const fs = require('fs');

class CategoryService {
  // Create new category with optional image
  async createCategory(categoryData, userId, imageFile = null) {
    try {
      // Validate parent category if provided
      if (categoryData.parentId) {
        const parentCategory = await categoryRepository.findById(categoryData.parentId);
        if (!parentCategory) {
          throw new AppError('Parent category not found', 404, 'PARENT_NOT_FOUND');
        }

        if (parentCategory.level >= 3) {
          throw new AppError('Maximum category depth exceeded', 400, 'MAX_DEPTH_EXCEEDED');
        }
      }

      // Handle image upload if provided
      if (imageFile) {
        const imageData = await this.processImageUpload(imageFile);
        categoryData.image = imageData;
      }

      // Generate SEO fields if not provided
      if (!categoryData.seoTitle) {
        categoryData.seoTitle = categoryData.name;
      }

      if (!categoryData.seoDescription && categoryData.description) {
        categoryData.seoDescription = categoryData.description.substring(0, 160);
      }

      // Set creator
      categoryData.createdBy = userId;
      categoryData.updatedBy = userId;

      const category = await categoryRepository.create(categoryData);

      // Update parent category counters if this is a subcategory
      if (category.parentId) {
        await categoryRepository.updateCounters(category.parentId);
      }

      return await categoryRepository.findById(category._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create category', 500, 'CREATE_CATEGORY_ERROR');
    }
  }

  // Process image upload (single image with thumbnail)
  async processImageUpload(imageFile) {
    try {
      // Validate file
      const validation = uploadService.validateFile(imageFile, 5242880, ['image/jpeg', 'image/png', 'image/webp']);
      if (!validation.valid) {
        throw new AppError(`Image validation failed: ${validation.errors.join(', ')}`, 400, 'INVALID_IMAGE');
      }

      // Upload original image
      const uploadResult = await uploadService.processSingleUpload(imageFile, 'categories', 'medium');

      if (!uploadResult.success) {
        throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
      }

      const { url, publicId, format, width, height, size, uploadedAt } = uploadResult.data;

      // Generate thumbnail
      const thumbnailResult = uploadService.generateThumbnail(publicId, 300, 300);

      // Delete temp file
      if (imageFile.path) {
        fs.unlink(imageFile.path, (err) => {
          if (err) console.error('Failed to delete temp file:', err);
        });
      }

      return {
        url,
        publicId,
        thumbnailUrl: thumbnailResult.data.url,
        format,
        width,
        height,
        size,
        uploadedAt: new Date(uploadedAt)
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to process image upload', 500, 'IMAGE_PROCESSING_ERROR');
    }
  }

  // Get category by ID
  async getCategoryById(id, includeRelations = false) {
    try {
      const category = await categoryRepository.findById(id, includeRelations);

      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get category', 500, 'GET_CATEGORY_ERROR');
    }
  }

  // Get category by slug
  async getCategoryBySlug(slug, includeRelations = false) {
    try {
      const category = await categoryRepository.findBySlug(slug, includeRelations);

      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get category by slug', 500, 'GET_CATEGORY_ERROR');
    }
  }

  // Get all categories with filtering and pagination
  async getCategories(options = {}) {
    try {
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
      } = options;

      const filters = {};
      if (status) filters.status = status;
      if (level !== undefined) filters.level = level;
      if (parentId !== undefined) filters.parentId = parentId;
      if (search) filters.search = search;
      if (isVisible !== undefined) filters.isVisible = isVisible;
      if (showInMenu !== undefined) filters.showInMenu = showInMenu;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured;

      return await categoryRepository.findAll(filters, page, limit, includeRelations);
    } catch (error) {
      throw new AppError('Failed to get categories', 500, 'GET_CATEGORIES_ERROR');
    }
  }

  // Get category tree
  async getCategoryTree(maxDepth = 3) {
    try {
      return await categoryRepository.getCategoryTree(maxDepth);
    } catch (error) {
      throw new AppError('Failed to get category tree', 500, 'GET_CATEGORY_TREE_ERROR');
    }
  }

  // Update category with optional image replacement
  async updateCategory(id, updateData, userId, imageFile = null) {
    try {
      const category = await categoryRepository.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Validate parent category change
      if (updateData.parentId && updateData.parentId !== category.parentId) {
        const newParent = await categoryRepository.findById(updateData.parentId);
        if (!newParent) {
          throw new AppError('New parent category not found', 404, 'PARENT_NOT_FOUND');
        }

        if (updateData.parentId === id) {
          throw new AppError('Category cannot be its own parent', 400, 'CIRCULAR_HIERARCHY');
        }

        if (newParent.level >= 3) {
          throw new AppError('Maximum category depth exceeded', 400, 'MAX_DEPTH_EXCEEDED');
        }
      }

      // Handle image replacement
      if (imageFile) {
        // Delete old image if exists
        if (category.image?.publicId) {
          try {
            await uploadService.deleteSingleImage(category.image.publicId);
          } catch (error) {
            console.warn('Failed to delete old category image:', error.message);
          }
        }

        // Upload new image
        const imageData = await this.processImageUpload(imageFile);
        updateData.image = imageData;
      }

      // Set updater
      updateData.updatedBy = userId;

      const updatedCategory = await categoryRepository.update(id, updateData);

      // Update counters for old and new parents if parent changed
      if (updateData.parentId !== undefined && updateData.parentId !== category.parentId) {
        if (category.parentId) {
          await categoryRepository.updateCounters(category.parentId);
        }
        if (updateData.parentId) {
          await categoryRepository.updateCounters(updateData.parentId);
        }
      }

      return await categoryRepository.findById(updatedCategory._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update category', 500, 'UPDATE_CATEGORY_ERROR');
    }
  }

  // Delete category and clean up image
  async deleteCategory(id) {
    try {
      const category = await categoryRepository.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      const canDelete = await category.canBeDeleted();
      if (!canDelete) {
        throw new AppError('Category cannot be deleted because it has subcategories or perks', 400, 'CATEGORY_HAS_DEPENDENCIES');
      }

      // Delete associated image
      if (category.image?.publicId) {
        try {
          await uploadService.deleteSingleImage(category.image.publicId);
        } catch (error) {
          console.warn('Failed to delete category image:', error.message);
        }
      }

      const deletedCategory = await categoryRepository.delete(id);

      // Update parent category counters
      if (deletedCategory.parentId) {
        await categoryRepository.updateCounters(deletedCategory.parentId);
      }

      return deletedCategory;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete category', 500, 'DELETE_CATEGORY_ERROR');
    }
  }

  // Get root categories
  async getRootCategories(includeInactive = false) {
    try {
      return await categoryRepository.getRootCategories(includeInactive);
    } catch (error) {
      throw new AppError('Failed to get root categories', 500, 'GET_ROOT_CATEGORIES_ERROR');
    }
  }

  // Get subcategories
  async getSubcategories(parentId, includeInactive = false) {
    try {
      const parentCategory = await categoryRepository.findById(parentId);
      if (!parentCategory) {
        throw new AppError('Parent category not found', 404, 'PARENT_NOT_FOUND');
      }

      return await categoryRepository.findByParentId(parentId, includeInactive);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get subcategories', 500, 'GET_SUBCATEGORIES_ERROR');
    }
  }

  // Get featured categories
  async getFeaturedCategories(limit = 6) {
    try {
      return await categoryRepository.getFeaturedCategories(limit);
    } catch (error) {
      throw new AppError('Failed to get featured categories', 500, 'GET_FEATURED_CATEGORIES_ERROR');
    }
  }

  // Get category breadcrumb
  async getCategoryBreadcrumb(id) {
    try {
      return await categoryRepository.getBreadcrumb(id);
    } catch (error) {
      throw new AppError('Failed to get category breadcrumb', 500, 'GET_BREADCRUMB_ERROR');
    }
  }

  // Search categories
  async searchCategories(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
      }

      return await categoryRepository.search(query.trim(), options);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search categories', 500, 'SEARCH_CATEGORIES_ERROR');
    }
  }

  // Get menu categories
  async getMenuCategories() {
    try {
      return await categoryRepository.getMenuCategories();
    } catch (error) {
      throw new AppError('Failed to get menu categories', 500, 'GET_MENU_CATEGORIES_ERROR');
    }
  }

  // Get filter categories
  async getFilterCategories() {
    try {
      return await categoryRepository.getFilterCategories();
    } catch (error) {
      throw new AppError('Failed to get filter categories', 500, 'GET_FILTER_CATEGORIES_ERROR');
    }
  }

  // Validate category slug
  async validateSlug(slug, excludeId = null) {
    try {
      const exists = await categoryRepository.slugExists(slug, excludeId);
      return { isValid: !exists, exists };
    } catch (error) {
      throw new AppError('Failed to validate slug', 500, 'VALIDATE_SLUG_ERROR');
    }
  }

  // Generate unique slug
  async generateUniqueSlug(name, excludeId = null) {
    try {
      const baseSlug = slugifyUtils.createSeoSlug(name);
      let slug = baseSlug;
      let counter = 1;

      while (await categoryRepository.slugExists(slug, excludeId)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      return slug;
    } catch (error) {
      throw new AppError('Failed to generate unique slug', 500, 'GENERATE_SLUG_ERROR');
    }
  }

  // Update category counters manually
  async updateCategoryCounters(id) {
    try {
      const category = await categoryRepository.findById(id);
      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      await categoryRepository.updateCounters(id);
      return await categoryRepository.findById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update category counters', 500, 'UPDATE_COUNTERS_ERROR');
    }
  }
}

module.exports = new CategoryService();