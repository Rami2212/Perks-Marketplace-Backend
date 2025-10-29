// models/Partner.js
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

const partnerSchema = new mongoose.Schema({
  // Partner Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  // Offer Details
  offerType: {
    type: String,
    enum: ['SaaS/AI Tools', 'B2B Services', 'Lifestyle'],
    required: [true, 'Offer type is required']
  },
  shortDescription: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  
  // Media - Updated for Cloudinary
  logo: imageSchema,
  
  // Submission Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'converted'],
    default: 'pending'
  },
  
  // Admin Processing
  adminNotes: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  
  // If converted to perk
  convertedToPerkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Perk'
  },
  
  // Source Tracking
  source: {
    referrer: String,
    userAgent: String,
    ipAddress: String,
    utmParameters: {
      source: String,
      medium: String,
      campaign: String
    }
  }
}, {
  timestamps: true
});

// Indexes
partnerSchema.index({ email: 1 });
partnerSchema.index({ status: 1, createdAt: -1 });
partnerSchema.index({ offerType: 1 });

// Method to approve partner
partnerSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  return this.save();
};

// Method to reject partner
partnerSchema.methods.reject = function(userId, notes) {
  this.status = 'rejected';
  this.reviewedBy = userId;
  this.reviewedAt = new Date();
  if (notes) this.adminNotes = notes;
  return this.save();
};

// Static method to find pending submissions
partnerSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Partner', partnerSchema);