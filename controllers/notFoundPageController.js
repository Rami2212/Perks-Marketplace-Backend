const NotFoundPage = require('../models/NotFoundPage');
const cloudinaryConfig = require('../config/cloudinary');
const { AppError } = require('../middleware/errorHandler');
const { catchAsync } = require('../middleware/errorHandler');

class NotFoundPageController {
  
  // GET /api/pages/404 (Public)
  // Fetch the active 404 page content
  getPublic404Page = catchAsync(async (req, res, next) => {
    const page = await NotFoundPage.getActivePage();
    
    if (!page) {
      return next(new AppError('404 page not found', 404, 'PAGE_NOT_FOUND'));
    }
    
    res.status(200).json({
      success: true,
      data: {
        pageTitle: page.pageTitle,
        mainHeading: page.mainHeading,
        description: page.description,
        ctaButton: page.ctaButton,
        backgroundImage: page.backgroundImage.url ? {
          url: page.backgroundImage.url
        } : null,
        seo: page.seo,
        suggestedLinks: page.suggestedLinks
      }
    });
  });
  
  // GET /api/admin/pages/404 (Admin)
  // Get 404 page for editing (includes all fields)
  getAdmin404Page = catchAsync(async (req, res, next) => {
    // Try to get active page first, if not exist, get any page
    let page = await NotFoundPage.getActivePage();
    
    if (!page) {
      page = await NotFoundPage.findOne();
    }
    
    // If still no page exists, return default structure
    if (!page) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No 404 page found. Create one by updating.'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        _id: page._id,
        pageTitle: page.pageTitle,
        mainHeading: page.mainHeading,
        description: page.description,
        ctaButton: page.ctaButton,
        backgroundImage: page.backgroundImage,
        seo: page.seo,
        suggestedLinks: page.suggestedLinks,
        status: page.status,
        updatedAt: page.updatedAt,
        updatedBy: page.updatedBy
      }
    });
  });
  
  // PUT /api/admin/pages/404 (Admin)
  // Update or create 404 page content
  update404Page = catchAsync(async (req, res, next) => {
    const {
      pageTitle,
      mainHeading,
      description,
      ctaButton,
      seo,
      suggestedLinks,
      status
    } = req.body;
    
    // Check if a 404 page already exists
    let page = await NotFoundPage.findOne();
    
    if (page) {
      // Update existing page
      page.pageTitle = pageTitle || page.pageTitle;
      page.mainHeading = mainHeading || page.mainHeading;
      page.description = description || page.description;
      
      if (ctaButton) {
        page.ctaButton = ctaButton;
      }
      
      if (seo) {
        page.seo = {
          ...page.seo,
          ...seo
        };
      }
      
      if (suggestedLinks) {
        page.suggestedLinks = suggestedLinks;
      }
      
      if (status) {
        page.status = status;
        
        // If setting to active, ensure no other page is active
        if (status === 'active') {
          await NotFoundPage.ensureSingleActive(page._id);
        }
      }
      
      page.updatedBy = req.user.id;
      page.updatedAt = Date.now();
      
      await page.save();
      
      res.status(200).json({
        success: true,
        message: '404 page updated successfully',
        data: page
      });
      
    } else {
      // Create new page
      const newPage = await NotFoundPage.create({
        pageTitle,
        mainHeading,
        description,
        ctaButton,
        seo: seo || {},
        suggestedLinks: suggestedLinks || [],
        status: status || 'active',
        updatedBy: req.user.id
      });
      
      // Ensure only this page is active if status is active
      if (newPage.status === 'active') {
        await NotFoundPage.ensureSingleActive(newPage._id);
      }
      
      res.status(201).json({
        success: true,
        message: '404 page created successfully',
        data: newPage
      });
    }
  });
  
  // POST /api/admin/pages/404/upload (Admin)
  // Upload background image for 404 page
  upload404Image = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError('No image file provided', 400, 'FILE_REQUIRED'));
    }
    
    // Get or create 404 page
    let page = await NotFoundPage.findOne();
    
    if (!page) {
      return next(new AppError('404 page not found. Create page first before uploading images.', 404, 'PAGE_NOT_FOUND'));
    }
    
    // Delete old image from Cloudinary if exists
    if (page.backgroundImage && page.backgroundImage.publicId) {
      try {
        await cloudinaryConfig.deleteImage(page.backgroundImage.publicId);
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue anyway - don't fail upload if deletion fails
      }
    }
    
    // Upload new image to Cloudinary
    const uploadResult = await cloudinaryConfig.uploadImage(
      req.file,
      '404-pages',
      'banner'
    );
    
    // Update page with new image
    page.backgroundImage = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      filename: req.file.originalname
    };
    
    page.updatedBy = req.user.id;
    page.updatedAt = Date.now();
    
    await page.save();
    
    res.status(200).json({
      success: true,
      message: 'Background image uploaded successfully',
      data: {
        backgroundImage: page.backgroundImage
      }
    });
  });
  
  // DELETE /api/admin/pages/404/image (Admin)
  // Delete background image from 404 page
  delete404Image = catchAsync(async (req, res, next) => {
    const page = await NotFoundPage.findOne();
    
    if (!page) {
      return next(new AppError('404 page not found', 404, 'PAGE_NOT_FOUND'));
    }
    
    if (!page.backgroundImage || !page.backgroundImage.publicId) {
      return next(new AppError('No background image to delete', 400, 'NO_IMAGE'));
    }
    
    // Delete from Cloudinary
    await cloudinaryConfig.deleteImage(page.backgroundImage.publicId);
    
    // Clear image from database
    page.backgroundImage = {
      url: null,
      publicId: null,
      filename: null
    };
    
    page.updatedBy = req.user.id;
    page.updatedAt = Date.now();
    
    await page.save();
    
    res.status(200).json({
      success: true,
      message: 'Background image deleted successfully'
    });
  });
}

module.exports = new NotFoundPageController();