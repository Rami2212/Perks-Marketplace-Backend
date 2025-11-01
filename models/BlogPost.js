// models/BlogPost.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  filename: String,
  alt: String
}, { _id: false });

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    trim: true
  },
  
  // Media - Updated for Cloudinary
  featuredImage: imageSchema,
  
  // Author
  author: {
    name: {
      type: String,
      required: true
    },
    logo: imageSchema
  },
  
  // Categorization
  tags: [String],
  category: String,
  
  // Publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  scheduledAt: Date,
  
  // SEO
  seo: {
    title: String,
    metaDescription: String,
    canonicalUrl: String,
    ogImage: imageSchema,
    keywords: [String]
  },
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  
  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
blogPostSchema.index({ slug: 1 }, { unique: true });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text'
});

// Virtual for reading time (approximate)
blogPostSchema.virtual('readingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Method to check if published
blogPostSchema.methods.isPublished = function() {
  return this.status === 'published' && this.publishedAt && this.publishedAt <= new Date();
};

// Static method to find published posts
blogPostSchema.statics.findPublished = function() {
  return this.find({
    status: 'published',
    publishedAt: { $lte: new Date() }
  }).sort({ publishedAt: -1 });
};

// Middleware to set publishedAt when status changes to published
blogPostSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema);