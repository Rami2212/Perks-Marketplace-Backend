const seoService = require('../services/seoService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

class SeoController {
  // File upload middleware
  uploadSeoImages = upload.fields([
    { name: 'defaultOgImage', maxCount: 1 },
    { name: 'organizationLogo', maxCount: 1 }
  ]);

  // Get active SEO settings
  getSeoSettings = catchAsync(async (req, res) => {
    const settings = await seoService.getActiveSettings();

    res.status(200).json({
      success: true,
      data: settings
    });
  });

  // Update SEO settings
  updateSeoSettings = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    // Organize uploaded files
    const imageFiles = {};
    if (req.files) {
      if (req.files.defaultOgImage) imageFiles.defaultOgImage = req.files.defaultOgImage[0];
      if (req.files.organizationLogo) imageFiles.organizationLogo = req.files.organizationLogo[0];
    }

    const settings = await seoService.updateSeoSettings(req.body, req.user.id, imageFiles);

    res.status(200).json({
      success: true,
      data: settings,
      message: 'SEO settings updated successfully'
    });
  });

  // Get page SEO data
  getPageSeo = catchAsync(async (req, res) => {
    const { pageType = 'home', pageIdentifier } = req.query;
    const additionalData = req.body || {};

    const seoData = await seoService.getPageSeoData(pageType, pageIdentifier, additionalData);

    res.status(200).json({
      success: true,
      data: seoData
    });
  });

  // Generate meta tags for a page
  generateMetaTags = catchAsync(async (req, res) => {
    const pageData = req.body;
    const settings = await seoService.getActiveSettings();
    const metaTags = seoService.generateMetaTags(pageData, settings);

    res.status(200).json({
      success: true,
      data: {
        metaTags,
        htmlString: this.metaTagsToHtml(metaTags)
      }
    });
  });

  // Generate schema markup for a page
  generateSchemaMarkup = catchAsync(async (req, res) => {
    const pageData = req.body;
    const settings = await seoService.getActiveSettings();
    const schemaMarkup = seoService.generateSchemaMarkup(pageData, settings);

    res.status(200).json({
      success: true,
      data: {
        schemas: schemaMarkup,
        jsonLd: schemaMarkup.map(schema => `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`).join('\n')
      }
    });
  });

  // Regenerate sitemap
  regenerateSitemap = catchAsync(async (req, res) => {
    const sitemapXml = await seoService.regenerateSitemap();

    res.status(200).json({
      success: true,
      data: {
        sitemap: sitemapXml,
        message: 'Sitemap regenerated successfully'
      }
    });
  });

  // Regenerate robots.txt
  regenerateRobotsTxt = catchAsync(async (req, res) => {
    const robotsTxt = await seoService.regenerateRobotsTxt();

    res.status(200).json({
      success: true,
      data: {
        robots: robotsTxt,
        message: 'Robots.txt regenerated successfully'
      }
    });
  });

  // Get sitemap content
  getSitemap = catchAsync(async (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
      const sitemapContent = await fs.readFile(sitemapPath, 'utf8');
      
      res.setHeader('Content-Type', 'application/xml');
      res.send(sitemapContent);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SITEMAP_NOT_FOUND',
          message: 'Sitemap not found. Please generate it first.'
        }
      });
    }
  });

  // Get robots.txt content
  getRobots = catchAsync(async (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
      const robotsContent = await fs.readFile(robotsPath, 'utf8');
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(robotsContent);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROBOTS_NOT_FOUND',
          message: 'Robots.txt not found. Please generate it first.'
        }
      });
    }
  });

  // SEO analysis for a URL
  analyzePage = catchAsync(async (req, res) => {
    const { url, pageType, pageIdentifier } = req.body;
    
    const seoData = await seoService.getPageSeoData(pageType, pageIdentifier);
    const analysis = this.performSeoAnalysis(seoData);

    res.status(200).json({
      success: true,
      data: {
        url,
        analysis,
        recommendations: this.getSeoRecommendations(analysis)
      }
    });
  });

  // Helper method to convert meta tags to HTML
  metaTagsToHtml(metaTags) {
    return metaTags.map(tag => {
      if (tag.rel) {
        return `<link rel="${tag.rel}" href="${tag.href}">`;
      } else if (tag.property) {
        return `<meta property="${tag.property}" content="${tag.content}">`;
      } else {
        return `<meta name="${tag.name}" content="${tag.content}">`;
      }
    }).join('\n');
  }

  // Perform basic SEO analysis
  performSeoAnalysis(seoData) {
    const { pageData, metaTags } = seoData;
    const analysis = {
      score: 100,
      issues: [],
      warnings: [],
      passed: []
    };

    // Title length check
    const title = pageData.title || '';
    if (title.length === 0) {
      analysis.issues.push('Missing page title');
      analysis.score -= 20;
    } else if (title.length > 60) {
      analysis.warnings.push('Title is too long (over 60 characters)');
      analysis.score -= 5;
    } else if (title.length < 30) {
      analysis.warnings.push('Title might be too short (under 30 characters)');
      analysis.score -= 3;
    } else {
      analysis.passed.push('Title length is optimal');
    }

    // Description length check
    const description = pageData.description || '';
    if (description.length === 0) {
      analysis.issues.push('Missing meta description');
      analysis.score -= 15;
    } else if (description.length > 160) {
      analysis.warnings.push('Meta description is too long (over 160 characters)');
      analysis.score -= 5;
    } else if (description.length < 120) {
      analysis.warnings.push('Meta description might be too short (under 120 characters)');
      analysis.score -= 3;
    } else {
      analysis.passed.push('Meta description length is optimal');
    }

    // Open Graph checks
    const ogImageTag = metaTags.find(tag => tag.property === 'og:image');
    if (!ogImageTag) {
      analysis.warnings.push('Missing Open Graph image');
      analysis.score -= 5;
    } else {
      analysis.passed.push('Open Graph image present');
    }

    // Schema markup check
    if (seoData.schemaMarkup && seoData.schemaMarkup.length > 0) {
      analysis.passed.push('Schema markup present');
    } else {
      analysis.warnings.push('No schema markup found');
      analysis.score -= 5;
    }

    return analysis;
  }

  // Get SEO recommendations
  getSeoRecommendations(analysis) {
    const recommendations = [];

    analysis.issues.forEach(issue => {
      switch (issue) {
        case 'Missing page title':
          recommendations.push({
            type: 'critical',
            message: 'Add a unique, descriptive title for this page',
            action: 'Set page title'
          });
          break;
        case 'Missing meta description':
          recommendations.push({
            type: 'important',
            message: 'Add a compelling meta description to improve click-through rates',
            action: 'Set meta description'
          });
          break;
      }
    });

    analysis.warnings.forEach(warning => {
      recommendations.push({
        type: 'suggestion',
        message: warning,
        action: 'Review and optimize'
      });
    });

    return recommendations;
  }
}

module.exports = new SeoController();