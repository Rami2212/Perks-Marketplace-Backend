const mongoose = require('mongoose');
const slugifyUtils = require('../utils/slugify');

const perkSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Perk title is required'],
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
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot be more than 300 characters']
  },
  
  // Category Relationship
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  
  // Vendor Information
  vendor: {
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
      maxlength: [100, 'Vendor name cannot be more than 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Vendor email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    },
    logo: {
      url: String,
      publicId: String,
      thumbnailUrl: String,
      uploadedAt: Date
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Vendor description cannot be more than 500 characters']
    }
  },
  
  // Perk Details
  value: {
    type: String,
    required: [true, 'Perk value is required'],
    trim: true,
    maxlength: [100, 'Value cannot be more than 100 characters']
  },
  originalPrice: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'],
      default: 'USD'
    }
  },
  discountedPrice: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'],
      default: 'USD'
    }
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Perk Images
  images: {
    main: {
      url: String,
      publicId: String,
      thumbnailUrl: String,
      uploadedAt: Date
    },
    gallery: [{
      url: String,
      publicId: String,
      thumbnailUrl: String,
      uploadedAt: Date
    }]
  },
  
  // Redemption Information
  redemption: {
    type: {
      type: String,
      enum: ['code', 'link', 'email', 'phone', 'visit'],
      required: [true, 'Redemption type is required']
    },
    instructions: {
      type: String,
      required: [true, 'Redemption instructions are required'],
      trim: true,
      maxlength: [1000, 'Instructions cannot be more than 1000 characters']
    },
    code: {
      type: String,
      trim: true,
      maxlength: [50, 'Code cannot be more than 50 characters']
    },
    link: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid redemption URL']
    },
    expiryDate: {
      type: Date,
      index: true
    },
    limitations: {
      type: String,
      trim: true,
      maxlength: [500, 'Limitations cannot be more than 500 characters']
    }
  },
  
  // Availability
  availability: {
    isLimited: {
      type: Boolean,
      default: false
    },
    totalQuantity: {
      type: Number,
      min: 0,
      default: null
    },
    redeemedQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      index: true
    }
  },
  
  // SEO Information (Client Editable)
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
    },
    customMetaTags: [{
      name: String,
      content: String
    }]
  },
  
  // Tags and Features
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Each tag cannot be more than 30 characters']
  }],
  features: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each feature cannot be more than 100 characters']
  }],
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isExclusive: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  
  // Engagement Metrics
  metrics: {
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0
    },
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Approval and Review
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_revision'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot be more than 500 characters']
    },
    notes: [{
      content: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Client Information (Vendor who can edit SEO)
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required'],
    index: true
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
perkSchema.index({ slug: 1 }, { unique: true });
perkSchema.index({ categoryId: 1, status: 1 });
perkSchema.index({ clientId: 1, status: 1 });
perkSchema.index({ status: 1, isVisible: 1, 'availability.endDate': 1 });
perkSchema.index({ isFeatured: 1, status: 1, priority: -1 });
perkSchema.index({ 'vendor.email': 1 });
perkSchema.index({ tags: 1 });
perkSchema.index({ 'approval.status': 1 });
perkSchema.index({ 'redemption.expiryDate': 1 });

// Text search index
perkSchema.index({
  title: 'text',
  description: 'text',
  'vendor.name': 'text',
  tags: 'text'
});

// Compound indexes
perkSchema.index({ categoryId: 1, status: 1, priority: -1, createdAt: -1 });
perkSchema.index({ clientId: 1, status: 1, updatedAt: -1 });

// Virtual for remaining quantity
perkSchema.virtual('remainingQuantity').get(function() {
  if (!this.availability.isLimited || !this.availability.totalQuantity) {
    return null;
  }
  return Math.max(0, this.availability.totalQuantity - this.availability.redeemedQuantity);
});

// Virtual for is available
perkSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  
  // Check if perk is active and visible
  if (this.status !== 'active' || !this.isVisible) {
    return false;
  }
  
  // Check date range
  if (this.availability.startDate && this.availability.startDate > now) {
    return false;
  }
  
  if (this.availability.endDate && this.availability.endDate < now) {
    return false;
  }
  
  // Check quantity limits
  if (this.availability.isLimited && this.remainingQuantity <= 0) {
    return false;
  }
  
  return true;
});

// Virtual for is expired
perkSchema.virtual('isExpired').get(function() {
  const now = new Date();
  
  if (this.availability.endDate && this.availability.endDate < now) {
    return true;
  }
  
  if (this.redemption.expiryDate && this.redemption.expiryDate < now) {
    return true;
  }
  
  return false;
});

// Virtual for discount savings
perkSchema.virtual('savingsAmount').get(function() {
  if (this.originalPrice.amount && this.discountedPrice.amount) {
    return this.originalPrice.amount - this.discountedPrice.amount;
  }
  return 0;
});

// Virtual for category reference
perkSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Virtual for client reference
perkSchema.virtual('client', {
  ref: 'User',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to generate slug
perkSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('title')) {
    let baseSlug = slugifyUtils.createSeoSlug(this.title);
    
    const existingPerk = await this.constructor.findOne({ 
      slug: baseSlug,
      _id: { $ne: this._id }
    });
    
    if (existingPerk) {
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
perkSchema.pre('save', function(next) {
  // Auto-generate SEO title if not provided
  if (!this.seo.title) {
    this.seo.title = this.title.substring(0, 60);
  }
  
  // Auto-generate SEO description if not provided
  if (!this.seo.description) {
    this.seo.description = this.shortDescription || this.description.substring(0, 160);
  }
  
  // Auto-generate OG title if not provided
  if (!this.seo.ogTitle) {
    this.seo.ogTitle = this.seo.title;
  }
  
  // Auto-generate OG description if not provided
  if (!this.seo.ogDescription) {
    this.seo.ogDescription = this.seo.description;
  }
  
  // Calculate discount percentage if prices are provided
  if (this.originalPrice.amount && this.discountedPrice.amount) {
    this.discountPercentage = Math.round(
      ((this.originalPrice.amount - this.discountedPrice.amount) / this.originalPrice.amount) * 100
    );
  }
  
  next();
});

// Pre-save middleware to update metrics
perkSchema.pre('save', function(next) {
  if (this.metrics.viewCount > 0 && this.metrics.clickCount > 0) {
    this.metrics.conversionRate = (this.metrics.clickCount / this.metrics.viewCount) * 100;
  }
  next();
});

// Instance method to increment view count
perkSchema.methods.incrementViewCount = async function() {
  this.metrics.viewCount += 1;
  return this.save();
};

// Instance method to increment click count
perkSchema.methods.incrementClickCount = async function() {
  this.metrics.clickCount += 1;
  return this.save();
};

// Instance method to increment redemption count
perkSchema.methods.incrementRedemptionCount = async function() {
  this.metrics.redemptionCount += 1;
  this.availability.redeemedQuantity += 1;
  return this.save();
};

// Instance method to check if user can edit SEO
perkSchema.methods.canEditSEO = function(userId) {
  return this.clientId.toString() === userId.toString();
};

// Instance method to add approval note
perkSchema.methods.addApprovalNote = function(content, userId) {
  this.approval.notes.push({
    content,
    addedBy: userId,
    addedAt: new Date()
  });
  return this.save();
};

// Static method to get featured perks
perkSchema.statics.getFeaturedPerks = async function(limit = 10, categoryId = null) {
  const query = {
    status: 'active',
    isVisible: true,
    isFeatured: true
  };
  
  if (categoryId) {
    query.categoryId = categoryId;
  }
  
  return this.find(query)
    .populate('categoryId', 'name slug')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get active perks
perkSchema.statics.getActivePerks = async function(filters = {}, page = 1, limit = 20) {
  const query = {
    status: 'active',
    isVisible: true,
    'availability.startDate': { $lte: new Date() }
  };
  
  // Add end date filter for non-expired perks
  const endDateQuery = {
    $or: [
      { 'availability.endDate': { $exists: false } },
      { 'availability.endDate': null },
      { 'availability.endDate': { $gte: new Date() } }
    ]
  };
  Object.assign(query, endDateQuery);
  
  // Apply additional filters
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  if (filters.isFeatured) query.isFeatured = filters.isFeatured;
  if (filters.isExclusive) query.isExclusive = filters.isExclusive;
  if (filters.vendorEmail) query['vendor.email'] = filters.vendorEmail;
  
  const skip = (page - 1) * limit;
  
  const [perks, total] = await Promise.all([
    this.find(query)
      .populate('categoryId', 'name slug')
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return { perks, total };
};

// Static method to search perks
perkSchema.statics.searchPerks = async function(searchQuery, options = {}) {
  const {
    page = 1,
    limit = 20,
    categoryId = null,
    status = 'active'
  } = options;
  
  const query = {
    $text: { $search: searchQuery },
    status: status,
    isVisible: true
  };
  
  if (categoryId) query.categoryId = categoryId;
  
  const skip = (page - 1) * limit;
  
  const [perks, total] = await Promise.all([
    this.find(query)
      .populate('categoryId', 'name slug')
      .sort({ score: { $meta: 'textScore' }, isFeatured: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return { perks, total };
};

module.exports = mongoose.model('Perk', perkSchema);