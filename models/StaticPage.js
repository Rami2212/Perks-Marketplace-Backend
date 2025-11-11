// models/StaticPage.js
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
  filename: String
}, { _id: false });

const staticPageSchema = new mongoose.Schema({
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
  
  // Page Type
  pageType: {
    type: String,
    enum: ['about', 'contact', 'tos', 'privacy', 'faq', 'custom'],
    required: true
  },
  
  // Hero image schema
heroImage: imageSchema,
  
  // Contact Form (specific to contact page)
  contactForm: {
    enabled: {
      type: Boolean,
      default: false
    },
    fields: [{
      name: String,
      type: {
        type: String,
        enum: ['text', 'email', 'tel', 'textarea', 'select']
      },
      required: Boolean,
      placeholder: String,
      options: [String] // For select fields
    }],
    emailTo: String,
    thankYouMessage: String
  },
  
  // SEO
  seo: {
    title: String,
    metaDescription: String,
    canonicalUrl: String,
    ogImage: imageSchema
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  // Admin tracking
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
staticPageSchema.index({ slug: 1 }, { unique: true });
staticPageSchema.index({ pageType: 1 });

// Static method to find by slug
staticPageSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

// Static method to find by page type
staticPageSchema.statics.findByPageType = function(pageType) {
  return this.findOne({ pageType, status: 'active' });
};

module.exports = mongoose.model('StaticPage', staticPageSchema);