// models/SiteSettings.js
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

const videoSchema = new mongoose.Schema({
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

const siteSettingsSchema = new mongoose.Schema({
  // Global SEO
  seo: {
    defaultTitle: String,
    defaultDescription: String,
    defaultOgImage: imageSchema,
    robotsTxt: String,
    gtmId: String,
    gaId: String,
    metaPixelId: String
  },
  
  // Homepage Configuration
  homepage: {
    hero: {
      headline: String,
      subheadline: String,
      ctaText: String,
      ctaUrl: String,
      backgroundImage: imageSchema,
      backgroundVideo: videoSchema
    },
    sections: {
      featuredPerks: {
        enabled: {
          type: Boolean,
          default: true
        },
        title: String,
        description: String,
        limit: {
          type: Number,
          default: 6
        }
      },
      newestPerks: {
        enabled: {
          type: Boolean,
          default: true
        },
        title: String,
        limit: {
          type: Number,
          default: 8
        }
      },
      categoryHighlights: {
        enabled: {
          type: Boolean,
          default: true
        },
        title: String,
        selectedCategories: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category'
        }]
      }
    }
  },

  // Home page image schema
homepageImages: {
  heroBackground: imageSchema,
  section1Image: imageSchema,
  section2Image: imageSchema,
  section3Image: imageSchema
},
  
  // Navigation
  navigation: {
    header: [{
      title: String,
      url: String,
      icon: String,
      order: Number,
      children: [{
        title: String,
        url: String,
        order: Number
      }]
    }],
    footer: {
      sections: [{
        title: String,
        links: [{
          title: String,
          url: String
        }]
      }],
      socialMedia: [{
        platform: String,
        url: String,
        icon: String
      }],
      copyright: String,
      contactInfo: {
        email: String,
        phone: String,
        address: String
      }
    }
  },
  
  // Email Configuration
  email: {
    fromName: String,
    fromEmail: String,
    replyTo: String,
    notifications: {
      newLead: {
        type: Boolean,
        default: true
      },
      newPartner: {
        type: Boolean,
        default: true
      },
      newBlogComment: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Admin tracking
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one document exists (singleton pattern)
siteSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Method to update settings
siteSettingsSchema.statics.updateSettings = async function(updates, userId) {
  const settings = await this.getInstance();
  Object.assign(settings, updates);
  settings.updatedBy = userId;
  return settings.save();
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);