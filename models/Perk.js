// models/Perk.js
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
  size: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const perkSchema = new mongoose.Schema({
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
  shortDescription: {
    type: String,
    trim: true
  },
  longDescription: {
    type: String
  },
  
  // Vendor Information
  vendor: {
    name: {
      type: String,
      required: [true, 'Vendor name is required']
    },
    website: String,
    description: String
  },
  
  // Images - Updated for Cloudinary
  logo: imageSchema,
  banner: imageSchema,
  
  // Location & Availability
  location: {
    type: String,
    enum: ['Malaysia', 'Singapore', 'Global'],
    required: true
  },
  
  // Redemption Configuration
  redemptionMethod: {
    type: String,
    enum: ['affiliate_link', 'coupon_code', 'form_submission'],
    required: true
  },
  affiliateUrl: String,
  couponCode: String,
  leadFormConfig: {
    formSlug: String,
    thankYouUrl: String,
    redirectUrl: String,
    customFields: [{
      name: String,
      type: {
        type: String,
        enum: ['text', 'email', 'tel', 'textarea']
      },
      required: Boolean,
      placeholder: String
    }]
  },
  
  // Validity
  validFrom: Date,
  validTo: Date,
  
  // Categorization
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  tags: [String],
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // SEO Fields
  seo: {
    title: String,
    metaDescription: {
      type: String,
      maxlength: 160
    },
    canonicalUrl: String,
    ogImage: imageSchema,
    keywords: [String]
  },
  
  // Analytics Counters
  analytics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    leads: {
      type: Number,
      default: 0
    },
    affiliateClicks: {
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
  },
  publishedAt: Date
}, {
  timestamps: true
});

// Indexes
perkSchema.index({ status: 1, featured: -1, createdAt: -1 });
perkSchema.index({ categoryId: 1, status: 1 });
perkSchema.index({ location: 1, status: 1 });
perkSchema.index({ slug: 1 }, { unique: true });
perkSchema.index({ tags: 1 });
perkSchema.index({ validTo: 1, status: 1 });

// Text search index
perkSchema.index({
  title: 'text',
  shortDescription: 'text',
  'vendor.name': 'text',
  tags: 'text'
});

// Middleware to update 'updatedAt' timestamp
perkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if perk is expired
perkSchema.methods.isExpired = function() {
  if (!this.validTo) return false;
  return this.validTo < new Date();
};

// Static method to find active perks
perkSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('Perk', perkSchema);