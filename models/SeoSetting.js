const mongoose = require('mongoose');

const seoSettingSchema = new mongoose.Schema({
  // Site Identity
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
    maxlength: [100, 'Site name cannot be more than 100 characters']
  },
  siteDescription: {
    type: String,
    required: [true, 'Site description is required'],
    trim: true,
    maxlength: [500, 'Site description cannot be more than 500 characters']
  },
  siteUrl: {
    type: String,
    required: [true, 'Site URL is required'],
    trim: true,
    match: [/^https?:\/\/.+/, 'Please provide a valid site URL']
  },
  
  // Default Meta Tags
  defaultMetaTitle: {
    type: String,
    required: [true, 'Default meta title is required'],
    trim: true,
    maxlength: [60, 'Meta title cannot be more than 60 characters']
  },
  defaultMetaDescription: {
    type: String,
    required: [true, 'Default meta description is required'],
    trim: true,
    maxlength: [160, 'Meta description cannot be more than 160 characters']
  },
  defaultMetaKeywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each keyword cannot be more than 50 characters']
  }],
  
  // Open Graph Settings
  defaultOgTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'OG title cannot be more than 60 characters']
  },
  defaultOgDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'OG description cannot be more than 160 characters']
  },
  defaultOgImage: {
    url: String,
    publicId: String,
    width: Number,
    height: Number
  },
  ogType: {
    type: String,
    enum: ['website', 'article', 'product'],
    default: 'website'
  },
  
  // Twitter Card Settings
  twitterCardType: {
    type: String,
    enum: ['summary', 'summary_large_image', 'app', 'player'],
    default: 'summary_large_image'
  },
  twitterSite: {
    type: String,
    trim: true,
    match: [/^@\w+$/, 'Twitter handle must start with @']
  },
  twitterCreator: {
    type: String,
    trim: true,
    match: [/^@\w+$/, 'Twitter handle must start with @']
  },
  
  // Schema.org Organization
  organization: {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Organization description cannot be more than 500 characters']
    },
    url: String,
    logo: {
      url: String,
      publicId: String
    },
    contactPoint: {
      telephone: String,
      contactType: {
        type: String,
        enum: ['customer service', 'sales', 'support', 'billing'],
        default: 'customer service'
      },
      email: String
    },
    address: {
      streetAddress: String,
      addressLocality: String,
      addressRegion: String,
      postalCode: String,
      addressCountry: String
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      youtube: String
    }
  },
  
  // Sitemap Settings
  sitemapSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    includePerks: {
      type: Boolean,
      default: true
    },
    includeCategories: {
      type: Boolean,
      default: true
    },
    includeBlogPosts: {
      type: Boolean,
      default: true
    },
    changeFreq: {
      type: String,
      enum: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
      default: 'daily'
    },
    priority: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.5
    },
    lastGenerated: Date
  },
  
  // Robots.txt Settings
  robotsSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    allowAll: {
      type: Boolean,
      default: true
    },
    customRules: [{
      userAgent: {
        type: String,
        default: '*'
      },
      allow: [String],
      disallow: [String]
    }],
    crawlDelay: {
      type: Number,
      min: 0,
      max: 86400 // 24 hours in seconds
    },
    sitemapUrls: [String]
  },
  
  // Schema Markup Settings
  schemaSettings: {
    enableOrganization: {
      type: Boolean,
      default: true
    },
    enableWebsite: {
      type: Boolean,
      default: true
    },
    enableBreadcrumbs: {
      type: Boolean,
      default: true
    },
    enableProducts: {
      type: Boolean,
      default: true
    },
    enableOffers: {
      type: Boolean,
      default: true
    },
    enableSearchBox: {
      type: Boolean,
      default: true
    }
  },
  
  // Analytics and Tracking
  analytics: {
    googleAnalyticsId: String,
    googleTagManagerId: String,
    googleSearchConsole: {
      verificationCode: String,
      propertyUrl: String
    },
    bingWebmasterTools: {
      verificationCode: String
    },
    facebookPixelId: String
  },
  
  // Additional SEO Settings
  additionalSettings: {
    enableCanonicalUrls: {
      type: Boolean,
      default: true
    },
    enableHreflang: {
      type: Boolean,
      default: false
    },
    defaultLanguage: {
      type: String,
      default: 'en'
    },
    enableJsonLd: {
      type: Boolean,
      default: true
    },
    customMetaTags: [{
      name: String,
      content: String,
      httpEquiv: String,
      property: String
    }],
    customHeadScripts: String,
    customBodyScripts: String
  },
  
  // Audit Fields
  isActive: {
    type: Boolean,
    default: true
  },
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

// Indexes
seoSettingSchema.index({ isActive: 1 });
seoSettingSchema.index({ updatedAt: -1 });

// Virtual for full sitemap URL
seoSettingSchema.virtual('sitemapUrl').get(function() {
  return `${this.siteUrl}/sitemap.xml`;
});

// Virtual for robots.txt URL
seoSettingSchema.virtual('robotsUrl').get(function() {
  return `${this.siteUrl}/robots.txt`;
});

// Instance method to get organization schema
seoSettingSchema.methods.getOrganizationSchema = function() {
  if (!this.schemaSettings.enableOrganization) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: this.organization.name,
    description: this.organization.description,
    url: this.organization.url || this.siteUrl,
    logo: this.organization.logo?.url,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: this.organization.contactPoint?.telephone,
      contactType: this.organization.contactPoint?.contactType,
      email: this.organization.contactPoint?.email
    },
    address: this.organization.address ? {
      '@type': 'PostalAddress',
      streetAddress: this.organization.address.streetAddress,
      addressLocality: this.organization.address.addressLocality,
      addressRegion: this.organization.address.addressRegion,
      postalCode: this.organization.address.postalCode,
      addressCountry: this.organization.address.addressCountry
    } : undefined,
    sameAs: Object.values(this.organization.socialMedia || {}).filter(Boolean)
  };
};

// Instance method to get website schema
seoSettingSchema.methods.getWebsiteSchema = function() {
  if (!this.schemaSettings.enableWebsite) return null;
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: this.siteName,
    description: this.siteDescription,
    url: this.siteUrl,
    publisher: {
      '@type': 'Organization',
      name: this.organization.name,
      logo: this.organization.logo?.url
    }
  };
  
  if (this.schemaSettings.enableSearchBox) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: `${this.siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    };
  }
  
  return schema;
};

// Static method to get active SEO settings
seoSettingSchema.statics.getActiveSettings = async function() {
  return await this.findOne({ isActive: true }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('SeoSetting', seoSettingSchema);