// models/Category.js
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

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Icon - Updated for Cloudinary
  icon: imageSchema,
  
  // Hierarchy
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  order: {
    type: Number,
    default: 0
  },
  
  // SEO
  seo: {
    title: String,
    metaDescription: String,
    ogImage: imageSchema
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1, order: 1 });
categorySchema.index({ level: 1, status: 1, order: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Method to check if category is main category
categorySchema.methods.isMainCategory = function() {
  return this.level === 0 && !this.parentId;
};

// Static method to find main categories
categorySchema.statics.findMainCategories = function() {
  return this.find({ level: 0, parentId: null, status: 'active' }).sort({ order: 1 });
};

// Static method to find subcategories
categorySchema.statics.findSubcategories = function(parentId) {
  return this.find({ parentId, status: 'active' }).sort({ order: 1 });
};

module.exports = mongoose.model('Category', categorySchema);