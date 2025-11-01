const mongoose = require('mongoose');
const slugifyUtils = require('../utils/slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: [true, 'Category name must be unique'],
    trim: true,
    maxlength: [100, 'Category name cannot be more than 100 characters'],
    minlength: [2, 'Category name must be at least 2 characters']
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
  
  // Hierarchy support
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
    index: true
  },
  path: {
    type: String,
    index: true
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
  icon: {
    type: String,
    trim: true
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
  showInFilter: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Counters
  perkCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPerkCount: {
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
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1, displayOrder: 1 });
categorySchema.index({ status: 1, isVisible: 1 });
categorySchema.index({ level: 1, path: 1 });
categorySchema.index({ isFeatured: 1, status: 1 });
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ name: 1 }, { unique: true });

// Virtual for full hierarchy path
categorySchema.virtual('fullPath').get(function() {
  return this.path ? this.path.split('/').filter(Boolean) : [];
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  match: { status: 'active', isVisible: true }
});

// Virtual for parent category
categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to generate slug
categorySchema.pre('save', async function(next) {
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

// Pre-save middleware to set hierarchy path and level
categorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('parentId')) {
    if (this.parentId) {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${this.parentId}` : `/${this.parentId}`;
        
        if (this.level > 3) {
          return next(new Error('Maximum category depth (3 levels) exceeded'));
        }
      } else {
        return next(new Error('Parent category not found'));
      }
    } else {
      this.level = 0;
      this.path = '';
    }
  }
  next();
});

// Instance method to increment view count
categorySchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to get full hierarchy
categorySchema.methods.getFullHierarchy = async function() {
  const hierarchy = [];
  let current = this;
  
  while (current) {
    hierarchy.unshift({
      id: current._id,
      name: current.name,
      slug: current.slug,
      level: current.level,
      image: current.image
    });
    
    if (current.parentId) {
      current = await this.constructor.findById(current.parentId);
    } else {
      current = null;
    }
  }
  
  return hierarchy;
};

// Instance method to check if category can be deleted
categorySchema.methods.canBeDeleted = async function() {
  const Perk = mongoose.model('Perk');
  const perkCount = await Perk.countDocuments({ categoryId: this._id });
  const subcategoryCount = await this.constructor.countDocuments({ parentId: this._id });
  
  return perkCount === 0 && subcategoryCount === 0;
};

// Static method to build category tree
categorySchema.statics.buildTree = async function(parentId = null, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  const categories = await this.find({
    parentId: parentId,
    status: 'active',
    isVisible: true
  }).sort({ displayOrder: 1, name: 1 });
  
  const tree = [];
  
  for (const category of categories) {
    const categoryObj = category.toObject();
    categoryObj.children = await this.buildTree(category._id, maxDepth, currentDepth + 1);
    tree.push(categoryObj);
  }
  
  return tree;
};

// Static method to get featured categories
categorySchema.statics.getFeaturedCategories = async function(limit = 6) {
  return this.find({
    status: 'active',
    isVisible: true,
    isFeatured: true
  })
  .sort({ displayOrder: 1, perkCount: -1 })
  .limit(limit);
};

// Static method to update category counters
categorySchema.statics.updateCategoryCounters = async function(categoryId) {
  if (!categoryId) return;
  
  const Perk = mongoose.model('Perk');
  
  // Update direct perk count
  const directPerkCount = await Perk.countDocuments({ 
    categoryId: categoryId,
    status: 'active'
  });
  
  // Get all descendant categories
  const category = await this.findById(categoryId);
  if (!category) return;
  
  const descendants = await this.find({
    path: new RegExp(`${category.path}/${categoryId}`)
  });
  const descendantIds = descendants.map(d => d._id);
  
  // Update total perk count (including subcategories)
  const totalPerkCount = await Perk.countDocuments({
    categoryId: { $in: [categoryId, ...descendantIds] },
    status: 'active'
  });
  
  await this.findByIdAndUpdate(categoryId, {
    perkCount: directPerkCount,
    totalPerkCount: totalPerkCount
  });
  
  // Recursively update parent
  if (category.parentId) {
    await this.updateCategoryCounters(category.parentId);
  }
};

module.exports = mongoose.model('Category', categorySchema);