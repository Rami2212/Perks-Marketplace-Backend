const mongoose = require('mongoose');

const notFoundPageSchema = new mongoose.Schema({
  pageTitle: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true,
    maxlength: [100, 'Page title cannot exceed 100 characters']
  },
  
  mainHeading: {
    type: String,
    required: [true, 'Main heading is required'],
    trim: true,
    maxlength: [200, 'Main heading cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  
  ctaButton: {
    text: {
      type: String,
      required: [true, 'CTA button text is required'],
      trim: true,
      maxlength: [50, 'CTA text cannot exceed 50 characters']
    },
    link: {
      type: String,
      required: [true, 'CTA button link is required'],
      trim: true
    }
  },
  
  backgroundImage: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    },
    filename: {
      type: String,
      default: null
    }
  },
  
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    }
  },
  
  suggestedLinks: [{
    title: {
      type: String,
      required: [true, 'Link title is required'],
      trim: true
    },
    url: {
      type: String,
      required: [true, 'Link URL is required'],
      trim: true
    },
    icon: {
      type: String,
      trim: true,
      default: null
    }
  }],
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for quick active page lookup
notFoundPageSchema.index({ status: 1 });

// Pre-save middleware to update timestamp
notFoundPageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get active 404 page
notFoundPageSchema.statics.getActivePage = async function() {
  return await this.findOne({ status: 'active' });
};

// Static method to ensure only one active page
notFoundPageSchema.statics.ensureSingleActive = async function(excludeId = null) {
  const filter = { status: 'active' };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  
  await this.updateMany(filter, { status: 'inactive' });
};

const NotFoundPage = mongoose.model('NotFoundPage', notFoundPageSchema);

module.exports = NotFoundPage;