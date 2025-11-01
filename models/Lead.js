const mongoose = require('mongoose');
const { LEAD_STATUSES } = require('../utils/constants');

const leadSchema = new mongoose.Schema({
  // Contact Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    index: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
  },
  company: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters']
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+', 'not-specified'],
      default: 'not-specified'
    },
    industry: {
      type: String,
      trim: true,
      maxlength: [50, 'Industry cannot be more than 50 characters']
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL']
    }
  },
  
  // Lead Details
  source: {
    type: String,
    enum: ['website', 'form', 'email', 'phone', 'referral', 'social', 'advertising', 'other'],
    default: 'website',
    index: true
  },
  medium: {
    type: String,
    trim: true // utm_medium equivalent
  },
  campaign: {
    type: String,
    trim: true // utm_campaign equivalent
  },
  referrer: {
    type: String,
    trim: true
  },
  
  // Perk-related information
  perkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Perk',
    index: true
  },
  perkName: {
    type: String,
    trim: true // Store perk name for reference even if perk is deleted
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  categoryName: {
    type: String,
    trim: true
  },
  
  // Lead Classification
  status: {
    type: String,
    enum: Object.values(LEAD_STATUSES),
    default: LEAD_STATUSES.NEW,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  qualificationNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Qualification notes cannot be more than 1000 characters']
  },
  
  // Interest and Requirements
  message: {
    type: String,
    trim: true,
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  interests: [{
    type: String,
    trim: true
  }],
  budget: {
    range: {
      type: String,
      enum: ['under-1k', '1k-5k', '5k-10k', '10k-25k', '25k-50k', '50k+', 'not-specified'],
      default: 'not-specified'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'SGD', 'MYR'],
      default: 'USD'
    }
  },
  timeline: {
    type: String,
    enum: ['immediate', '1-month', '3-months', '6-months', '1-year', 'flexible'],
    default: 'flexible'
  },
  
  // Tracking Information
  ipAddress: {
    type: String,
    trim: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // UTM Parameters
  utmParams: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  },
  
  // Follow-up and Communication
  lastContactedAt: {
    type: Date,
    index: true
  },
  nextFollowUpAt: {
    type: Date,
    index: true
  },
  contactAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'whatsapp', 'linkedin', 'not-specified'],
    default: 'email'
  },
  
  // Conversion Tracking
  convertedAt: {
    type: Date,
    index: true
  },
  conversionValue: {
    type: Number,
    min: 0
  },
  conversionType: {
    type: String,
    enum: ['signup', 'purchase', 'demo', 'consultation', 'partnership', 'other']
  },
  
  // Lead Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedAt: {
    type: Date
  },
  
  // Tags and Notes
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  notes: [{
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Note cannot be more than 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['general', 'call', 'email', 'meeting', 'follow-up'],
      default: 'general'
    }
  }],
  
  // GDPR and Privacy
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentDate: {
    type: Date
  },
  marketingOptIn: {
    type: Boolean,
    default: false
  },
  dataProcessingConsent: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
leadSchema.index({ email: 1, perkId: 1 }); // Prevent duplicate submissions
leadSchema.index({ status: 1, priority: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ leadScore: -1, status: 1 });
leadSchema.index({ nextFollowUpAt: 1, status: 1 });
leadSchema.index({ convertedAt: -1 }); // For conversion analytics
leadSchema.index({ 'location.country': 1, 'location.city': 1 });

// Text search index
leadSchema.index({
  name: 'text',
  email: 'text',
  'company.name': 'text',
  message: 'text',
  'notes.content': 'text'
});

// Virtual for days since creation
leadSchema.virtual('daysSinceCreation').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for lead age category
leadSchema.virtual('ageCategory').get(function() {
  const days = this.daysSinceCreation;
  if (days <= 1) return 'fresh';
  if (days <= 7) return 'warm';
  if (days <= 30) return 'aging';
  return 'cold';
});

// Virtual for contact urgency
leadSchema.virtual('contactUrgency').get(function() {
  if (this.priority === 'urgent') return 'immediate';
  if (this.nextFollowUpAt && this.nextFollowUpAt < Date.now()) return 'overdue';
  if (this.nextFollowUpAt && this.nextFollowUpAt < Date.now() + 24 * 60 * 60 * 1000) return 'today';
  return 'scheduled';
});

// Virtual for conversion probability (simple scoring)
leadSchema.virtual('conversionProbability').get(function() {
  let score = this.leadScore;
  
  // Adjust based on engagement
  if (this.contactAttempts > 0) score += 10;
  if (this.notes.length > 0) score += 5;
  if (this.company.name) score += 5;
  if (this.phone) score += 5;
  
  // Adjust based on age
  const days = this.daysSinceCreation;
  if (days > 30) score -= 20;
  else if (days > 7) score -= 10;
  
  return Math.max(0, Math.min(100, score));
});

// Pre-save middleware to update updatedAt
leadSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Pre-save middleware to calculate lead score
leadSchema.pre('save', function(next) {
  let score = 0;
  
  // Basic information completeness
  if (this.name) score += 10;
  if (this.email) score += 15;
  if (this.phone) score += 10;
  if (this.company.name) score += 15;
  if (this.message && this.message.length > 50) score += 10;
  
  // Engagement indicators
  if (this.budget.range !== 'not-specified') score += 15;
  if (this.timeline !== 'flexible') score += 10;
  if (this.interests.length > 0) score += 5;
  
  // Source quality (some sources are higher quality)
  switch (this.source) {
    case 'referral': score += 20; break;
    case 'email': score += 15; break;
    case 'form': score += 10; break;
    case 'website': score += 5; break;
  }
  
  this.leadScore = Math.min(100, score);
  next();
});

// Instance method to add note
leadSchema.methods.addNote = function(content, addedBy, type = 'general') {
  this.notes.push({
    content,
    addedBy,
    type,
    addedAt: new Date()
  });
  return this.save();
};

// Instance method to assign lead
leadSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  return this.save();
};

// Instance method to update status
leadSchema.methods.updateStatus = function(newStatus, updatedBy) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.updatedBy = updatedBy;
  
  // Set conversion date if converting
  if (newStatus === LEAD_STATUSES.CONVERTED && oldStatus !== LEAD_STATUSES.CONVERTED) {
    this.convertedAt = new Date();
  }
  
  return this.save();
};

// Instance method to schedule follow-up
leadSchema.methods.scheduleFollowUp = function(date, updatedBy) {
  this.nextFollowUpAt = date;
  this.updatedBy = updatedBy;
  return this.save();
};

// Instance method to record contact attempt
leadSchema.methods.recordContactAttempt = function(updatedBy, notes) {
  this.contactAttempts += 1;
  this.lastContactedAt = new Date();
  this.updatedBy = updatedBy;
  
  if (notes) {
    this.notes.push({
      content: notes,
      addedBy: updatedBy,
      type: 'call',
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Static method to get lead statistics
leadSchema.statics.getLeadStats = async function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
        qualified: { $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        avgLeadScore: { $avg: '$leadScore' },
        totalConversionValue: { $sum: '$conversionValue' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, closed: 0,
    avgLeadScore: 0, totalConversionValue: 0
  };
};

// Static method to get conversion funnel
leadSchema.statics.getConversionFunnel = async function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }
  
  const funnel = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDaysToStatus: {
          $avg: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return funnel;
};

// Static method to get lead sources
leadSchema.statics.getLeadSources = async function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        avgLeadScore: { $avg: '$leadScore' }
      }
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$count', 0] },
            { $multiply: [{ $divide: ['$converted', '$count'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method for lead search
leadSchema.statics.searchLeads = async function(query, options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    source,
    assignedTo,
    priority
  } = options;
  
  const searchQuery = {
    $text: { $search: query }
  };
  
  if (status) searchQuery.status = status;
  if (source) searchQuery.source = source;
  if (assignedTo) searchQuery.assignedTo = assignedTo;
  if (priority) searchQuery.priority = priority;
  
  const skip = (page - 1) * limit;
  
  const [leads, total] = await Promise.all([
    this.find(searchQuery)
      .populate('perkId', 'title slug')
      .populate('categoryId', 'name slug')
      .populate('assignedTo', 'name email')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(searchQuery)
  ]);
  
  return { leads, total };
};

module.exports = mongoose.model('Lead', leadSchema);