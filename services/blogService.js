// services/blogService.js

const blogRepository = require('../repositories/blogRepository');
const blogCategoryRepository = require('../repositories/blogCategoryRepository');
const uploadService = require('./uploadService');
const slugifyUtils = require('../utils/slugify');
const { AppError } = require('../middleware/errorHandler');
const BlogAnalyticsEvent = require('../models/BlogAnalyticsEvent');

class BlogService {
  // Create new blog post
  async createPost(postData, userId, imageFiles = {}) {
    try {
      // Validate category exists
      if (postData.categoryId) {
        const category = await blogCategoryRepository.findById(postData.categoryId);
        if (!category) {
          throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
        }
      }

      // Handle featured image upload
      if (imageFiles.featuredImage) {
        const featuredImageData = await this.processImageUpload(imageFiles.featuredImage);
        postData.featuredImage = featuredImageData;
      }

      // Handle author logo upload
      if (imageFiles.authorLogo && postData.author) {
        const authorLogoData = await this.processImageUpload(imageFiles.authorLogo);
        if (!postData.author) postData.author = {};
        postData.author.logo = authorLogoData;
      }

      // Handle gallery images upload
      if (imageFiles.gallery && imageFiles.gallery.length > 0) {
        const galleryData = await Promise.all(
          imageFiles.gallery.map(file => this.processImageUpload(file))
        );
        postData.gallery = galleryData;
      }

      // Set audit fields
      postData.createdBy = userId;
      postData.updatedBy = userId;

      const post = await blogRepository.create(postData);

      // Update category counters
      if (post.categoryId) {
        await blogCategoryRepository.updateCounters(post.categoryId);
      }

      return await blogRepository.findById(post._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create blog post', 500, 'CREATE_POST_ERROR');
    }
  }

  // Process image upload
  async processImageUpload(imageFile) {
    try {
      const validation = uploadService.validateFile(imageFile, 5242880, ['image/jpeg', 'image/png', 'image/webp']);
      if (!validation.valid) {
        throw new AppError(`Image validation failed: ${validation.errors.join(', ')}`, 400, 'INVALID_IMAGE');
      }

      const uploadResult = await uploadService.processSingleUpload(imageFile, 'blog-posts', 'medium');

      if (!uploadResult.success) {
        throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
      }

      const { url, publicId, format, width, height, size, uploadedAt } = uploadResult.data;
      const thumbnailResult = uploadService.generateThumbnail(publicId, 300, 300);

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

  // Get blog post by ID
  async getPostById(id, includeRelations = false) {
    try {
      const post = await blogRepository.findById(id, includeRelations);

      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blog post', 500, 'GET_POST_ERROR');
    }
  }

  // Get blog post by slug (Public)
  async getPostBySlug(slug, includeRelations = false) {
    try {
      const post = await blogRepository.findBySlug(slug, includeRelations);

      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      // Only return if post is published and visible for public access
      if (post.status !== 'published' || !post.isVisible) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get blog post by slug', 500, 'GET_POST_ERROR');
    }
  }

  // Get all blog posts (Admin)
  async getPosts(options = {}) {
    try {
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
      } = options;

      const filters = {};
      if (status) filters.status = status;
      if (categoryId) filters.categoryId = categoryId;
      if (isVisible !== undefined) filters.isVisible = isVisible;
      if (createdBy) filters.createdBy = createdBy;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (search) filters.search = search;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
      if (sortBy) filters.sortBy = sortBy;

      return await blogRepository.findAll(filters, page, limit, includeRelations);
    } catch (error) {
      throw new AppError('Failed to get blog posts', 500, 'GET_POSTS_ERROR');
    }
  }

  // Get published blog posts (Public)
  async getPublishedPosts(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        tags
      } = options;

      const filters = {};
      if (categoryId) filters.categoryId = categoryId;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

      return await blogRepository.findPublishedPosts(filters, page, limit);
    } catch (error) {
      throw new AppError('Failed to get published blog posts', 500, 'GET_PUBLISHED_POSTS_ERROR');
    }
  }

  // Get blog posts by category (Public)
  async getPostsByCategory(categoryId, page = 1, limit = 20) {
    try {
      return await blogRepository.findByCategoryId(categoryId, page, limit, true);
    } catch (error) {
      throw new AppError('Failed to get blog posts by category', 500, 'GET_POSTS_BY_CATEGORY_ERROR');
    }
  }

  // Get related blog posts
  async getRelatedPosts(postId, limit = 5) {
    try {
      return await blogRepository.getRelatedPosts(postId, limit);
    } catch (error) {
      throw new AppError('Failed to get related blog posts', 500, 'GET_RELATED_POSTS_ERROR');
    }
  }

  // Update blog post
  async updatePost(id, updateData, userId, imageFiles = {}) {
    try {
      const post = await blogRepository.findById(id);
      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      // Handle featured image replacement
      if (imageFiles.featuredImage) {
        // Delete old featured image
        if (post.featuredImage?.publicId) {
          try {
            await uploadService.deleteSingleImage(post.featuredImage.publicId);
          } catch (error) {
            console.warn('Failed to delete old featured image:', error.message);
          }
        }

        const featuredImageData = await this.processImageUpload(imageFiles.featuredImage);
        updateData.featuredImage = featuredImageData;
      }

      // Handle author logo replacement
      if (imageFiles.authorLogo) {
        // Delete old author logo
        if (post.author?.logo?.publicId) {
          try {
            await uploadService.deleteSingleImage(post.author.logo.publicId);
          } catch (error) {
            console.warn('Failed to delete old author logo:', error.message);
          }
        }

        const authorLogoData = await this.processImageUpload(imageFiles.authorLogo);
        if (!updateData.author) updateData.author = post.author || {};
        updateData.author.logo = authorLogoData;
      }

      // Handle gallery images addition/replacement
      if (imageFiles.gallery && imageFiles.gallery.length > 0) {
        const galleryData = await Promise.all(
          imageFiles.gallery.map(file => this.processImageUpload(file))
        );
        
        // Append to existing gallery or create new
        if (updateData.appendGallery) {
          updateData.gallery = [...(post.gallery || []), ...galleryData];
          delete updateData.appendGallery;
        } else {
          // Delete old gallery images if replacing
          if (post.gallery && post.gallery.length > 0) {
            const publicIds = post.gallery.map(img => img.publicId).filter(Boolean);
            if (publicIds.length > 0) {
              try {
                await uploadService.deleteMultipleImages(publicIds);
              } catch (error) {
                console.warn('Failed to delete old gallery images:', error.message);
              }
            }
          }
          updateData.gallery = galleryData;
        }
      }

      // Set updater
      updateData.updatedBy = userId;
      
      const updatedPost = await blogRepository.update(id, updateData);

      // Update category counters if category changed
      if (updateData.categoryId && updateData.categoryId !== post.categoryId) {
        if (post.categoryId) {
          await blogCategoryRepository.updateCounters(post.categoryId);
        }
        await blogCategoryRepository.updateCounters(updateData.categoryId);
      }

      return await blogRepository.findById(updatedPost._id, true);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update blog post', 500, 'UPDATE_POST_ERROR');
    }
  }

  // Delete blog post
  async deletePost(id, userId) {
    try {
      const post = await blogRepository.findById(id);
      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      // Delete associated images
      const imagesToDelete = [];

      if (post.featuredImage?.publicId) {
        imagesToDelete.push(post.featuredImage.publicId);
      }

      if (post.author?.logo?.publicId) {
        imagesToDelete.push(post.author.logo.publicId);
      }

      if (post.gallery && post.gallery.length > 0) {
        post.gallery.forEach(img => {
          if (img.publicId) imagesToDelete.push(img.publicId);
        });
      }

      // Delete images from Cloudinary
      if (imagesToDelete.length > 0) {
        try {
          await uploadService.deleteMultipleImages(imagesToDelete);
        } catch (error) {
          console.warn('Failed to delete blog post images:', error.message);
        }
      }

      const deletedPost = await blogRepository.delete(id);

      // Update category counters
      if (deletedPost.categoryId) {
        await blogCategoryRepository.updateCounters(deletedPost.categoryId);
      }

      return deletedPost;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete blog post', 500, 'DELETE_POST_ERROR');
    }
  }

  // Search blog posts (Public)
  async searchPosts(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_SEARCH_QUERY');
      }

      return await blogRepository.search(query.trim(), options);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to search blog posts', 500, 'SEARCH_POSTS_ERROR');
    }
  }

  // Track blog post view
  async trackView(id, trackingData = {}) {
    try {
      // Track in analytics event
      const analyticsEvent = new BlogAnalyticsEvent({
        eventType: 'view',
        postId: id,
        ...trackingData
      });
      await analyticsEvent.save();

      // Increment view counter in post
      return await blogRepository.incrementViewCount(id);
    } catch (error) {
      console.warn('Failed to track view for blog post:', id, error.message);
      return null;
    }
  }

  // Track blog post share
  async trackShare(id, trackingData = {}) {
    try {
      // Track in analytics event
      const analyticsEvent = new BlogAnalyticsEvent({
        eventType: 'share',
        postId: id,
        ...trackingData
      });
      await analyticsEvent.save();

      // Increment share counter in post
      return await blogRepository.incrementShareCount(id);
    } catch (error) {
      console.warn('Failed to track share for blog post:', id, error.message);
      return null;
    }
  }

  // Track blog post click
  async trackClick(id, trackingData = {}) {
    try {
      // Track in analytics event
      const analyticsEvent = new BlogAnalyticsEvent({
        eventType: 'click',
        postId: id,
        ...trackingData
      });
      await analyticsEvent.save();

      // Increment click counter in post
      return await blogRepository.incrementClickCount(id);
    } catch (error) {
      console.warn('Failed to track click for blog post:', id, error.message);
      return null;
    }
  }

  // Get blog post statistics (Admin)
  async getPostStats(dateRange = {}) {
    try{
    return await blogRepository.getStats(dateRange);
    } catch (error) {
      throw new AppError('Failed to get blog post statistics', 500, 'GET_STATS_ERROR');
    }
  }

  // Validate blog post slug
  async validateSlug(slug, excludeId = null) {
    try {
      const exists = await blogRepository.slugExists(slug, excludeId);
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

      while (await blogRepository.slugExists(slug, excludeId)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      return slug;
    } catch (error) {
      throw new AppError('Failed to generate unique slug', 500, 'GENERATE_SLUG_ERROR');
    }
  }

  // Remove image from gallery
  async removeGalleryImage(postId, imagePublicId, userId) {
    try {
      const post = await blogRepository.findById(postId);
      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      // Find and remove the image from gallery
      const updatedGallery = post.gallery.filter(img => img.publicId !== imagePublicId);

      if (updatedGallery.length === post.gallery.length) {
        throw new AppError('Image not found in gallery', 404, 'IMAGE_NOT_FOUND');
      }

      // Delete image from Cloudinary
      try {
        await uploadService.deleteSingleImage(imagePublicId);
      } catch (error) {
        console.warn('Failed to delete gallery image:', error.message);
      }

      // Update post
      const updateData = {
        gallery: updatedGallery,
        updatedBy: userId
      };

      return await blogRepository.update(postId, updateData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to remove gallery image', 500, 'REMOVE_IMAGE_ERROR');
    }
  }
}

module.exports = new BlogService();