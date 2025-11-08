const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

class AnalyticsService {
  constructor() {
    this.measurementId = process.env.GA4_MEASUREMENT_ID;
    this.apiSecret = process.env.GA4_API_SECRET;
    this.propertyId = process.env.GA4_PROPERTY_ID;
    this.enabled = process.env.GA4_ENABLED === 'true';
    this.debug = process.env.GA4_DEBUG === 'true';
    
    // Initialize GA4 Data API client for reporting
    if (this.propertyId && process.env.GA4_SERVICE_ACCOUNT_KEY_PATH) {
      try {
        this.dataClient = new BetaAnalyticsDataClient({
          keyFilename: process.env.GA4_SERVICE_ACCOUNT_KEY_PATH,
        });
      } catch (error) {
        console.warn('GA4 Data API client initialization failed:', error.message);
      }
    }

    // Validate required configuration
    if (!this.measurementId || !this.apiSecret) {
      console.warn('GA4 configuration incomplete. Analytics tracking disabled.');
      this.enabled = false;
    }

    this.baseUrl = 'https://www.google-analytics.com/mp/collect';
    this.debugUrl = 'https://www.google-analytics.com/debug/mp/collect';
  }

  // Check if analytics is properly configured
  isConfigured() {
    return this.enabled && this.measurementId && this.apiSecret;
  }

  // Generate client ID (should be unique per user/session)
  generateClientId() {
    return uuidv4();
  }

  // Send event to GA4 via Measurement Protocol
  async sendEvent(eventName, parameters = {}, clientId = null, userId = null) {
    if (!this.isConfigured()) {
      if (this.debug) {
        console.log('GA4 tracking disabled or not configured');
      }
      return null;
    }

    try {
      const payload = {
        client_id: clientId || this.generateClientId(),
        events: [{
          name: eventName,
          params: {
            ...parameters,
            // Add default parameters
            engagement_time_msec: parameters.engagement_time_msec || 100,
            page_location: parameters.page_location || 'server-side',
            page_title: parameters.page_title || 'API Event'
          }
        }]
      };

      // Add user ID if provided
      if (userId) {
        payload.user_id = userId.toString();
      }

      const url = this.debug ? this.debugUrl : this.baseUrl;
      const response = await axios.post(url, payload, {
        params: {
          measurement_id: this.measurementId,
          api_secret: this.apiSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (this.debug) {
        console.log('GA4 Event sent:', eventName, parameters);
        if (response.data) {
          console.log('GA4 Debug response:', response.data);
        }
      }

      return response.data;
    } catch (error) {
      console.error('GA4 tracking error:', error.message);
      return null;
    }
  }

  // Track custom events with proper GA4 event structure
  async trackEvent(eventType, data = {}, options = {}) {
    const { clientId, userId } = options;
    
    try {
      switch (eventType) {
        case 'LEAD_SUBMISSION':
          return await this.trackLeadSubmission(data, clientId, userId);
        
        case 'LEAD_STATUS_CHANGE':
          return await this.trackLeadStatusChange(data, clientId, userId);
        
        case 'LEAD_ASSIGNED':
          return await this.trackLeadAssigned(data, clientId, userId);
        
        case 'LEAD_CONTACT_ATTEMPT':
          return await this.trackLeadContactAttempt(data, clientId, userId);
        
        case 'LEAD_CONVERTED':
          return await this.trackLeadConverted(data, clientId, userId);
        
        case 'PERK_VIEW':
          return await this.trackPerkView(data, clientId, userId);
        
        case 'PERK_CLICK':
          return await this.trackPerkClick(data, clientId, userId);
        
        case 'PERK_SHARE':
          return await this.trackPerkShare(data, clientId, userId);
        
        case 'CATEGORY_VIEW':
          return await this.trackCategoryView(data, clientId, userId);
        
        case 'SEARCH_PERFORMED':
          return await this.trackSearch(data, clientId, userId);
        
        case 'USER_SIGNUP':
          return await this.trackUserSignup(data, clientId, userId);
        
        case 'USER_LOGIN':
          return await this.trackUserLogin(data, clientId, userId);
        
        default:
          // Generic custom event
          return await this.sendEvent(eventType.toLowerCase(), data, clientId, userId);
      }
    } catch (error) {
      console.error('Event tracking error:', error);
      return null;
    }
  }

  // Specific event tracking methods

  // Lead Events
  async trackLeadSubmission(data, clientId, userId) {
    return await this.sendEvent('generate_lead', {
      currency: 'USD',
      value: data.score || 0,
      lead_type: data.source || 'website',
      perk_id: data.perkId,
      category_id: data.categoryId,
      lead_score: data.score,
      source: data.source
    }, clientId, userId);
  }

  async trackLeadStatusChange(data, clientId, userId) {
    return await this.sendEvent('lead_status_change', {
      lead_id: data.leadId,
      old_status: data.oldStatus,
      new_status: data.newStatus,
      updated_by: data.updatedBy
    }, clientId, userId);
  }

  async trackLeadAssigned(data, clientId, userId) {
    return await this.sendEvent('lead_assigned', {
      lead_id: data.leadId,
      assigned_to: data.assignedTo,
      assigned_by: data.assignedBy
    }, clientId, userId);
  }

  async trackLeadContactAttempt(data, clientId, userId) {
    return await this.sendEvent('lead_contact_attempt', {
      lead_id: data.leadId,
      contact_method: data.contactMethod,
      user_id: data.userId
    }, clientId, userId);
  }

  async trackLeadConverted(data, clientId, userId) {
    return await this.sendEvent('purchase', {
      currency: 'USD',
      value: data.conversionValue || 0,
      transaction_id: data.leadId,
      conversion_type: data.conversionType,
      lead_id: data.leadId,
      converted_by: data.convertedBy
    }, clientId, userId);
  }

  // Perk Events
  async trackPerkView(data, clientId, userId) {
    return await this.sendEvent('view_item', {
      item_id: data.perkId,
      item_name: data.title,
      item_category: data.category,
      item_brand: data.vendor,
      currency: 'USD',
      value: data.value || 0,
      perk_type: data.type
    }, clientId, userId);
  }

  async trackPerkClick(data, clientId, userId) {
    return await this.sendEvent('select_content', {
      content_type: 'perk',
      item_id: data.perkId,
      item_name: data.title,
      item_category: data.category,
      click_type: data.clickType || 'cta_button'
    }, clientId, userId);
  }

  async trackPerkShare(data, clientId, userId) {
    return await this.sendEvent('share', {
      content_type: 'perk',
      item_id: data.perkId,
      item_name: data.title,
      method: data.shareMethod
    }, clientId, userId);
  }

  // Category Events
  async trackCategoryView(data, clientId, userId) {
    return await this.sendEvent('view_item_list', {
      item_list_id: data.categoryId,
      item_list_name: data.categoryName,
      category_level: data.level
    }, clientId, userId);
  }

  // Search Events
  async trackSearch(data, clientId, userId) {
    return await this.sendEvent('search', {
      search_term: data.query,
      search_results: data.resultsCount || 0,
      search_type: data.type || 'general'
    }, clientId, userId);
  }

  // User Events
  async trackUserSignup(data, clientId, userId) {
    return await this.sendEvent('sign_up', {
      method: data.method || 'email',
      user_type: data.userType || 'client'
    }, clientId, userId);
  }

  async trackUserLogin(data, clientId, userId) {
    return await this.sendEvent('login', {
      method: data.method || 'email',
      user_type: data.userType || 'client'
    }, clientId, userId);
  }

  // Enhanced conversion tracking
  async trackConversion(conversionData, clientId, userId) {
    const { type, value, currency = 'USD', leadId, perkId } = conversionData;
    
    return await this.sendEvent('purchase', {
      transaction_id: leadId || uuidv4(),
      value: value,
      currency: currency,
      items: [{
        item_id: perkId,
        item_name: conversionData.itemName,
        item_category: conversionData.category,
        quantity: 1,
        price: value
      }],
      conversion_type: type
    }, clientId, userId);
  }

  // E-commerce events (if needed for future features)
  async trackPurchase(purchaseData, clientId, userId) {
    return await this.sendEvent('purchase', {
      transaction_id: purchaseData.transactionId,
      value: purchaseData.value,
      currency: purchaseData.currency || 'USD',
      items: purchaseData.items || []
    }, clientId, userId);
  }

  // Page view tracking
  async trackPageView(pageData, clientId, userId) {
    return await this.sendEvent('page_view', {
      page_title: pageData.title,
      page_location: pageData.url,
      page_path: pageData.path
    }, clientId, userId);
  }

  // Form interaction tracking
  async trackFormSubmission(formData, clientId, userId) {
    return await this.sendEvent('form_submit', {
      form_name: formData.formName,
      form_destination: formData.destination,
      form_submit_text: formData.submitText || 'Submit'
    }, clientId, userId);
  }

  // File download tracking
  async trackFileDownload(downloadData, clientId, userId) {
    return await this.sendEvent('file_download', {
      file_name: downloadData.fileName,
      file_extension: downloadData.fileExtension,
      link_url: downloadData.linkUrl
    }, clientId, userId);
  }

  // REPORTING METHODS using GA4 Data API

  // Get basic analytics data
  async getAnalyticsData(dateRange = { startDate: '7daysAgo', endDate: 'today' }) {
    if (!this.dataClient || !this.propertyId) {
      throw new Error('GA4 Data API not configured');
    }

    try {
      const [response] = await this.dataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'pageviews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ],
        dimensions: [
          { name: 'date' }
        ]
      });

      return this.formatAnalyticsResponse(response);
    } catch (error) {
      console.error('GA4 Data API error:', error);
      throw error;
    }
  }

  // Get lead conversion data
  async getLeadConversions(dateRange = { startDate: '30daysAgo', endDate: 'today' }) {
    if (!this.dataClient) {
      throw new Error('GA4 Data API not configured');
    }

    try {
      const [response] = await this.dataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        metrics: [
          { name: 'eventCount' }
        ],
        dimensions: [
          { name: 'eventName' },
          { name: 'customEvent:lead_id' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT',
              value: 'generate_lead'
            }
          }
        }
      });

      return this.formatAnalyticsResponse(response);
    } catch (error) {
      console.error('Lead conversions error:', error);
      throw error;
    }
  }

  // Get perk performance data
  async getPerkPerformance(dateRange = { startDate: '30daysAgo', endDate: 'today' }) {
    if (!this.dataClient) {
      throw new Error('GA4 Data API not configured');
    }

    try {
      const [response] = await this.dataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [dateRange],
        metrics: [
          { name: 'eventCount' }
        ],
        dimensions: [
          { name: 'eventName' },
          { name: 'customEvent:item_id' },
          { name: 'customEvent:item_name' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: {
              values: ['view_item', 'select_content']
            }
          }
        },
        orderBys: [{
          metric: {
            metricName: 'eventCount'
          },
          desc: true
        }]
      });

      return this.formatAnalyticsResponse(response);
    } catch (error) {
      console.error('Perk performance error:', error);
      throw error;
    }
  }

  // Format GA4 API response
  formatAnalyticsResponse(response) {
    if (!response.rows) {
      return { data: [], totals: {} };
    }

    const data = response.rows.map(row => {
      const dimensions = {};
      const metrics = {};

      row.dimensionValues?.forEach((value, index) => {
        const dimensionName = response.dimensionHeaders[index].name;
        dimensions[dimensionName] = value.value;
      });

      row.metricValues?.forEach((value, index) => {
        const metricName = response.metricHeaders[index].name;
        metrics[metricName] = parseFloat(value.value) || 0;
      });

      return { dimensions, metrics };
    });

    return {
      data,
      totals: response.totals?.[0] || {},
      rowCount: response.rowCount || 0
    };
  }

  // Middleware for automatic client ID generation and tracking
  createTrackingMiddleware() {
    return (req, res, next) => {
      // Generate or extract client ID from request
      req.clientId = req.headers['x-client-id'] || 
                    req.cookies?.ga_client_id || 
                    this.generateClientId();
      
      // Set client ID in response cookie for frontend tracking
      if (!req.cookies?.ga_client_id) {
        res.cookie('ga_client_id', req.clientId, {
          maxAge: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
          httpOnly: false, // Allow frontend access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      // Add tracking helper methods to response
      res.trackEvent = async (eventType, data = {}) => {
        return await this.trackEvent(eventType, data, {
          clientId: req.clientId,
          userId: req.user?.id
        });
      };

      next();
    };
  }
}

module.exports = new AnalyticsService();