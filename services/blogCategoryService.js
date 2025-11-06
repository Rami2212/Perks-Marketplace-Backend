// services/blogCategoryService.js

const blogCategoryRepository = require('../repositories/blogCategoryRepository');
const uploadService = require('./uploadService');
const slugifyUtils = require('../utils/slugify');
const { AppError } = require('../middleware/errorHandler');

class BlogCategoryService {
  // Create new blog category with optional image
  async createCategory(categoryData, userId, imageFile = null) {
    try {
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

      const category = await blogCategoryRepository.create(categoryData);

      return await blogCategoryRepository.findById(category._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create blog category', 500, 'CREATE_CATEGORY_ERROR');
    }
  }

  // Process image upload
  async processImageUpload(imageFile) {
    try {
      const validation = uploadService.validateFile(imageFile, 5242880, ['image/jpeg', 'image/png', 'image/webp']);
      if (!validation.valid) {
        throw new AppError(`Image validation failed: ${validation.errors.join(', ')}`, 400, 'INVALID_IMAGE');
      }
      
      const uploadResult = await uploadService.processSingleUpload(imageFile, 'blog-categories', 'medium');

      if (!uploadResult.success) {
        throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
      }

      const { url, publicId, format, width, height, size, uploadedAt } = uploadResult.data;
      const thumbnailResult = uploadService.generateThumbnail(publicId, 300, 300);

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

  // Get blog category by ID
  async getCategoryById(id, includeRelations = false) {
    try {
      const category = await blogCategoryRepository.findById(id, includeRelations);

      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blog category', 500, 'GET_CATEGORY_ERROR');
    }
  }

  // Get blog category by slug
  async getCategoryBySlug(slug, includeRelations = false) {
    try {
      const category = await blogCategoryRepository.findBySlug(slug, includeRelations);

      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blog category by slug', 500, 'GET_CATEGORY_ERROR');
    }
  }

  // Get all blog categories with filtering and pagination
  async getCategories(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        isVisible,
        showInMenu,
        isFeatured,
        includeRelations = false
      } = options;

      const filters = {};
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (isVisible !== undefined) filters.isVisible = isVisible;
      if (showInMenu !== undefined) filters.showInMenu = showInMenu;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured;

      return await blogCategoryRepository.findAll(filters, page, limit, includeRelations);
    } catch (error) {
      throw new AppError('Failed to get blog categories', 500, 'GET_CATEGORIES_ERROR');
    }
  }

  // Update blog category with optional image replacement
  async updateCategory(id, updateData, userId, imageFile = null) {
    try {
      const category = await blogCategoryRepository.findById(id);
      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Handle image replacement
      if (imageFile) {
        // Delete old image if exists
        if (category.image?.publicId) {
          try {
            await uploadService.deleteSingleImage(category.image.publicId);
          } catch (error) {
            console.warn('Failed to delete old blog category image:', error.message);
          }
        }

        // Upload new image
        const imageData = await this.processImageUpload(imageFile);
        updateData.image = imageData;
      }

      // Set updater
      updateData.updatedBy = userId;

      const updatedCategory = await blogCategoryRepository.update(id, updateData);

      return await blogCategoryRepository.findById(updatedCategory._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update blog category', 500, 'UPDATE_CATEGORY_ERROR');
    }
  }

  // Delete blog category and clean up image
  async deleteCategory(categoryId) {
    try {
      const category = await blogCategoryRepository.findById(categoryId);
      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Delete associated image
      if (category.image?.publicId) {
        try {
          await uploadService.deleteSingleImage(category.image.publicId);
        } catch (error) {
          console.warn('Failed to delete blog category image:', error.message);
        }
      }

      await blogCategoryRepository.delete(categoryId);

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete blog category', 500, 'DELETE_CATEGORY_ERROR');
    }
  }

  // Get featured blog categories
  async getFeaturedCategories(limit = 6) {
    try {
      return await blogCategoryRepository.getFeaturedCategories(limit);
    } catch (error) {
      throw new AppError('Failed to get featured blog categories', 500, 'GET_FEATURED_CATEGORIES_ERROR');
    }
  }

  // Search blog categories
  async searchCategories(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
      }

      return await blogCategoryRepository.search(query.trim(), options);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search blog categories', 500, 'SEARCH_CATEGORIES_ERROR');
    }
  }

  // Get menu blog categories
  async getMenuCategories() {
    try {
      return await blogCategoryRepository.getMenuCategories();
    } catch (error) {
      throw new AppError('Failed to get menu blog categories', 500, 'GET_MENU_CATEGORIES_ERROR');
    }
  }

  // Validate blog category slug
  async validateSlug(slug, excludeId = null) {
    try {
      const exists = await blogCategoryRepository.slugExists(slug, excludeId);
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

      while (await blogCategoryRepository.slugExists(slug, excludeId)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      return slug;
    } catch (error) {
      throw new AppError('Failed to generate unique slug', 500, 'GENERATE_SLUG_ERROR');
    }
  }

  // Update blog category counters
  async updateCategoryCounters(id) {
    try {
      const category = await blogCategoryRepository.findById(id);
      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      await blogCategoryRepository.updateCounters(id);
      return await blogCategoryRepository.findById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update blog category counters', 500, 'UPDATE_COUNTERS_ERROR');
    }
  }
}

module.exports = new BlogCategoryService();