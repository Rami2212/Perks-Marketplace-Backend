// models/BlogPost.js

const mongoose = require('mongoose');
const slugifyUtils = require('../utils/slugify');

const blogPostSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Blog post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
    minlength: [3, 'Title must be at least 3 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  
  // Category
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogCategory',
    index: true
  },
  
  // Author Information (embedded)
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author name cannot be more than 100 characters']
    },
    logo: {
      url: String,
      publicId: String,
      thumbnailUrl: String,
      uploadedAt: Date
    }
  },
  
  // Images
  featuredImage: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    alt: String,
    uploadedAt: Date
  },
  gallery: [{
    url: String,
    publicId: String,
    thumbnailUrl: String,
    alt: String,
    uploadedAt: Date
  }],
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Each tag cannot be more than 30 characters']
  }],
  
  // Publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  publishedAt: {
    type: Date,
    index: true
  },
  scheduledAt: {
    type: Date
  },
  
  // SEO Fields
  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: [60, 'SEO title cannot be more than 60 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [160, 'SEO description cannot be more than 160 characters']
    },
    keywords: [{
      type: String,
      trim: true,
      maxlength: [50, 'Each keyword cannot be more than 50 characters']
    }],
    ogTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'OG title cannot be more than 60 characters']
    },
    ogDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'OG description cannot be more than 160 characters']
    },
    ogImage: {
      url: String,
      publicId: String
    },
    canonicalUrl: {
      type: String,
      trim: true
    }
  },
  
  // Analytics Counters
  analytics: {
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdated: Date
  },
  
  // Read Time (in minutes)
  readTime: {
    type: Number,
    default: 5
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
  },
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ status: 1, isVisible: 1, publishedAt: -1 });
blogPostSchema.index({ categoryId: 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ createdBy: 1 });
blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });

// Virtual for category reference
blogPostSchema.virtual('category', {
  ref: 'BlogCategory',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Virtual for is published
blogPostSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.isVisible && this.publishedAt && this.publishedAt <= new Date();
});

// Pre-save middleware to generate slug
blogPostSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('title')) {
    let baseSlug = slugifyUtils.createSeoSlug(this.title);
    
    const existingPost = await this.constructor.findOne({ 
      slug: baseSlug,
      _id: { $ne: this._id }
    });
    
    if (existingPost) {
      let counter = 1;
      let slug = `${baseSlug}-${counter}`;
      
      while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
      
      this.slug = slug;
    } else {
      this.slug = baseSlug;
    }
  }
  
  next();
});

// Pre-save middleware to auto-generate SEO fields if not provided
blogPostSchema.pre('save', function(next) {
  // Auto-generate SEO title if not provided
  if (!this.seo.title) {
    this.seo.title = this.title.substring(0, 60);
  }
  
  // Auto-generate SEO description if not provided
  if (!this.seo.description) {
    this.seo.description = this.excerpt.substring(0, 160);
  }
  
  // Auto-generate OG title if not provided
  if (!this.seo.ogTitle) {
    this.seo.ogTitle = this.seo.title;
  }
  
  // Auto-generate OG description if not provided
  if (!this.seo.ogDescription) {
    this.seo.ogDescription = this.seo.description;
  }
  
  // Calculate read time based on content word count
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Set publishedAt if status changed to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Instance method to increment view count
blogPostSchema.methods.incrementViewCount = async function() {
  this.analytics.viewCount += 1;
  this.analytics.lastUpdated = new Date();
  return this.save();
};

// Instance method to increment share count
blogPostSchema.methods.incrementShareCount = async function() {
  this.analytics.shareCount += 1;
  this.analytics.lastUpdated = new Date();
  return this.save();
};

// Instance method to increment click count
blogPostSchema.methods.incrementClickCount = async function() {
  this.analytics.clickCount += 1;
  this.analytics.lastUpdated = new Date();
  return this.save();
};

// Static method to get published posts
blogPostSchema.statics.getPublishedPosts = async function(filters = {}, page = 1, limit = 20) {
  const query = {
    status: 'published',
    isVisible: true,
    publishedAt: { $lte: new Date() }
  };
  
  // Apply additional filters
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    this.find(query)
      .populate('categoryId', 'name slug')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return { posts, total };
};

// Static method to get related posts based on tags and category
blogPostSchema.statics.getRelatedPosts = async function(postId, limit = 5) {
  const post = await this.findById(postId);
  if (!post) return [];
  
  const query = {
    _id: { $ne: postId },
    status: 'published',
    isVisible: true,
    publishedAt: { $lte: new Date() },
    $or: [
      { tags: { $in: post.tags } },
      { categoryId: post.categoryId }
    ]
  };
  
  return this.find(query)
    .select('title slug excerpt featuredImage publishedAt readTime')
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to search posts
blogPostSchema.statics.searchPosts = async function(searchQuery, options = {}) {
  const {
    page = 1,
    limit = 20,
    categoryId = null,
    status = 'published'
  } = options;
  
  const query = {
    $text: { $search: searchQuery },
    status: status,
    isVisible: true
  };
  
  if (categoryId) query.categoryId = categoryId;
  if (status === 'published') query.publishedAt = { $lte: new Date() };
  
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    this.find(query)
      .populate('categoryId', 'name slug')
      .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return { posts, total };
};

module.exports = mongoose.model('BlogPost', blogPostSchema);