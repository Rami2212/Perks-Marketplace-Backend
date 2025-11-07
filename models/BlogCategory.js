// models/BlogCategory.js

const mongoose = require('mongoose');
const slugifyUtils = require('../utils/slugify');

const blogCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Blog category name is required'],
    unique: [true, 'Blog category name must be unique'],
    trim: true,
    maxlength: [100, 'Blog category name cannot be more than 100 characters'],
    minlength: [2, 'Blog category name must be at least 2 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  
  // Simple Image Management
  image: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    format: String,
    width: Number,
    height: Number,
    size: Number,
    uploadedAt: Date
  },
  
  // Display properties
  displayOrder: {
    type: Number,
    default: 0,
    index: true
  },
  color: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  
  // SEO properties
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot be more than 60 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot be more than 160 characters']
  },
  seoKeywords: [{
    type: String,
    trim: true
  }],
  
  // Status and visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active',
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Counters
  postCount: {
    type: Number,
    default: 0,
    min: 0
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Audit fields
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
    default: Date.now
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
blogCategorySchema.index({ slug: 1 }, { unique: true });
blogCategorySchema.index({ status: 1, isVisible: 1 });
blogCategorySchema.index({ isFeatured: 1, status: 1 });
blogCategorySchema.index({ name: 'text', description: 'text' });
blogCategorySchema.index({ name: 1 }, { unique: true });

// Pre-save middleware to generate slug
blogCategorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    let baseSlug = slugifyUtils.createSeoSlug(this.name);
    
    const existingCategory = await this.constructor.findOne({ 
      slug: baseSlug,
      _id: { $ne: this._id }
    });
    
    if (existingCategory) {
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

// Instance method to increment view count
blogCategorySchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  return this.save();
};

// Static method to get featured categories
blogCategorySchema.statics.getFeaturedCategories = async function(limit = 6) {
  return this.find({
    status: 'active',
    isVisible: true,
    isFeatured: true
  })
  .sort({ displayOrder: 1, postCount: -1 })
  .limit(limit);
};

// Static method to update category counters
blogCategorySchema.statics.updateCategoryCounters = async function(categoryId) {
  if (!categoryId) return;
  
  const BlogPost = mongoose.model('BlogPost');
  
  // Update post count
  const postCount = await BlogPost.countDocuments({ 
    categoryId: categoryId,
    status: 'published',
    isVisible: true
  });
  
  await this.findByIdAndUpdate(categoryId, {
    postCount: postCount
  });
};

module.exports = mongoose.model('BlogCategory', blogCategorySchema);