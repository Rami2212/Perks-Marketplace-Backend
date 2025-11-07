// models/BlogAnalyticsEvent.js

const mongoose = require('mongoose');

const blogAnalyticsEventSchema = new mongoose.Schema({
  // Event Details
  eventType: {
    type: String,
    enum: ['view', 'share', 'click'],
    required: true,
    index: true
  },
  
  // Related Entities
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogPost',
    required: true,
    index: true
  },
  
  // Session & User Data
  sessionId: {
    type: String,
    index: true
  },
  userId: String,
  
  // Tracking Information
  source: {
    referrer: String,
    userAgent: String,
    ipAddress: String,
    utmParameters: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    }
  },
  
  // Context Data
  pageUrl: String,
  elementId: String,
  metadata: mongoose.Schema.Types.Mixed,
  
  // Geolocation (optional)
  location: {
    country: String,
    region: String,
    city: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Indexes for performance
blogAnalyticsEventSchema.index({ postId: 1, eventType: 1, createdAt: -1 });
blogAnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
blogAnalyticsEventSchema.index({ sessionId: 1 });

// TTL index to automatically delete old events after 1 year
blogAnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('BlogAnalyticsEvent', blogAnalyticsEventSchema);