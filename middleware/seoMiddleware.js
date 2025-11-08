const seoService = require('../services/seoService');

// Middleware to inject SEO data into responses
const seoMiddleware = (pageType = 'custom') => {
  return async (req, res, next) => {
    try {
      // Add SEO helper methods to response object
      res.setSeoData = async (pageIdentifier, additionalData = {}) => {
        try {
          const seoData = await seoService.getPageSeoData(pageType, pageIdentifier, additionalData);
          res.locals.seo = seoData;
          return seoData;
        } catch (error) {
          console.error('SEO middleware error:', error);
          res.locals.seo = null;
          return null;
        }
      };

      // Helper to generate meta tags HTML
      res.getMetaTagsHtml = () => {
        if (!res.locals.seo || !res.locals.seo.metaTags) return '';
        
        return res.locals.seo.metaTags.map(tag => {
          if (tag.rel) {
            return `<link rel="${tag.rel}" href="${tag.href}">`;
          } else if (tag.property) {
            return `<meta property="${tag.property}" content="${tag.content}">`;
          } else {
            return `<meta name="${tag.name}" content="${tag.content}">`;
          }
        }).join('\n');
      };

      // Helper to generate JSON-LD schema
      res.getSchemaJson = () => {
        if (!res.locals.seo || !res.locals.seo.schemaMarkup) return '';
        
        return res.locals.seo.schemaMarkup
          .map(schema => `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`)
          .join('\n');
      };

      next();
    } catch (error) {
      console.error('SEO middleware initialization error:', error);
      next();
    }
  };
};

module.exports = { seoMiddleware };