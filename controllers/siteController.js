// controllers/siteController.js
const SiteSettings = require('../models/SiteSettings');
const StaticPage = require('../models/StaticPage');
const Partner = require('../models/Partner');
const uploadService = require('../services/uploadService');
const { AppError } = require('../middleware/errorHandler');

class SiteController {
  // ==========================================
  // HOMEPAGE SETTINGS
  // ==========================================

  /**
   * Get homepage settings (Public)
   */
  async getHomepageSettings(req, res, next) {
    try {
      const settings = await SiteSettings.getInstance();

      res.json({
        success: true,
        data: {
          hero: settings.homepage?.hero || {},
          sections: settings.homepage?.sections || {},
          homepageImages: settings.homepageImages || {}
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update homepage settings (Admin)
   */
  async updateHomepageSettings(req, res, next) {
    try {
      const { hero, sections } = req.body;
      const settings = await SiteSettings.getInstance();

      if (hero) {
        settings.homepage.hero = {
          ...settings.homepage.hero,
          ...hero
        };
      }

      if (sections) {
        settings.homepage.sections = {
          ...settings.homepage.sections,
          ...sections
        };
      }

      settings.updatedBy = req.user.id;
      await settings.save();

      res.json({
        success: true,
        message: 'Homepage settings updated successfully',
        data: {
          hero: settings.homepage.hero,
          sections: settings.homepage.sections,
          homepageImages: settings.homepageImages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload homepage images (Admin)
   */
  async uploadHomepageImages(req, res, next) {
    try {
      const settings = await SiteSettings.getInstance();
      const uploadedImages = {};

      // Handle hero background
      if (req.files.heroBackground) {
        const file = req.files.heroBackground[0];
        const result = await uploadService.processSingleUpload(file, 'homepage', 'large');
        
        // Delete old image if exists
        if (settings.homepageImages?.heroBackground?.publicId) {
          await uploadService.deleteSingleImage(settings.homepageImages.heroBackground.publicId);
        }

        uploadedImages.heroBackground = {
          url: result.data.url,
          publicId: result.data.publicId,
          filename: file.originalname
        };
      }

      // Handle section1Image
      if (req.files.section1Image) {
        const file = req.files.section1Image[0];
        const result = await uploadService.processSingleUpload(file, 'homepage', 'medium');
        
        if (settings.homepageImages?.section1Image?.publicId) {
          await uploadService.deleteSingleImage(settings.homepageImages.section1Image.publicId);
        }

        uploadedImages.section1Image = {
          url: result.data.url,
          publicId: result.data.publicId,
          filename: file.originalname
        };
      }

      // Handle section2Image
      if (req.files.section2Image) {
        const file = req.files.section2Image[0];
        const result = await uploadService.processSingleUpload(file, 'homepage', 'medium');
        
        if (settings.homepageImages?.section2Image?.publicId) {
          await uploadService.deleteSingleImage(settings.homepageImages.section2Image.publicId);
        }

        uploadedImages.section2Image = {
          url: result.data.url,
          publicId: result.data.publicId,
          filename: file.originalname
        };
      }

      // Handle section3Image
      if (req.files.section3Image) {
        const file = req.files.section3Image[0];
        const result = await uploadService.processSingleUpload(file, 'homepage', 'medium');
        
        if (settings.homepageImages?.section3Image?.publicId) {
          await uploadService.deleteSingleImage(settings.homepageImages.section3Image.publicId);
        }

        uploadedImages.section3Image = {
          url: result.data.url,
          publicId: result.data.publicId,
          filename: file.originalname
        };
      }

      // Update settings with new images
      settings.homepageImages = {
        ...settings.homepageImages,
        ...uploadedImages
      };
      settings.updatedBy = req.user.id;
      await settings.save();

      res.json({
        success: true,
        message: 'Homepage images uploaded successfully',
        data: uploadedImages
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ABOUT PAGE
  // ==========================================

  /**
   * Get about page (Public)
   */
  async getAboutPage(req, res, next) {
    try {
      const aboutPage = await StaticPage.findByPageType('about');

      if (!aboutPage) {
        throw new AppError('About page not found', 404, 'PAGE_NOT_FOUND');
      }

      res.json({
        success: true,
        data: aboutPage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update about page (Admin)
   */
  async updateAboutPage(req, res, next) {
    try {
      const { title, content, seo } = req.body;

      let aboutPage = await StaticPage.findByPageType('about');

      if (!aboutPage) {
        // Create if doesn't exist
        aboutPage = new StaticPage({
          pageType: 'about',
          slug: 'about',
          title: title || 'About Us',
          content: content || '',
          status: 'active'
        });
      } else {
        if (title) aboutPage.title = title;
        if (content) aboutPage.content = content;
        if (seo) aboutPage.seo = { ...aboutPage.seo, ...seo };
      }

      aboutPage.updatedBy = req.user.id;
      await aboutPage.save();

      res.json({
        success: true,
        message: 'About page updated successfully',
        data: aboutPage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload about page hero image (Admin)
   */
  async uploadAboutPageImage(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'NO_FILE');
      }

      let aboutPage = await StaticPage.findByPageType('about');

      if (!aboutPage) {
        throw new AppError('About page not found. Create the page first.', 404, 'PAGE_NOT_FOUND');
      }

      // Upload to Cloudinary
      const result = await uploadService.processSingleUpload(req.file, 'about-page', 'large');

      // Delete old hero image if exists
      if (aboutPage.heroImage?.publicId) {
        await uploadService.deleteSingleImage(aboutPage.heroImage.publicId);
      }

      // Update about page with new hero image
      aboutPage.heroImage = {
        url: result.data.url,
        publicId: result.data.publicId,
        filename: req.file.originalname
      };
      aboutPage.updatedBy = req.user.id;
      await aboutPage.save();

      res.json({
        success: true,
        message: 'About page hero image uploaded successfully',
        data: {
          heroImage: aboutPage.heroImage
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FEATURED PARTNERS
  // ==========================================

  /**
   * Get featured partners for homepage (Public)
   */
  async getFeaturedPartners(req, res, next) {
    try {
      const partners = await Partner.find({
        status: 'approved',
        displayOnHomepage: true
      })
        .select('companyName logo')
        .sort({ createdAt: -1 })
        .limit(12);

      res.json({
        success: true,
        count: partners.length,
        data: partners
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle featured status for partner (Admin)
   */
  async togglePartnerFeatured(req, res, next) {
    try {
      const { id } = req.params;
      const { displayOnHomepage } = req.body;

      const partner = await Partner.findById(id);

      if (!partner) {
        throw new AppError('Partner not found', 404, 'PARTNER_NOT_FOUND');
      }

      if (partner.status !== 'approved') {
        throw new AppError('Only approved partners can be featured', 400, 'PARTNER_NOT_APPROVED');
      }

      partner.displayOnHomepage = displayOnHomepage;
      await partner.save();

      res.json({
        success: true,
        message: `Partner ${displayOnHomepage ? 'added to' : 'removed from'} homepage`,
        data: {
          id: partner._id,
          companyName: partner.companyName,
          displayOnHomepage: partner.displayOnHomepage
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SiteController();