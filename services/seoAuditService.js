// services/seoAuditService.js

const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const seoValidator = require('../utils/seoValidator');
const { AppError } = require('../middleware/errorHandler');

class SeoAuditService {
  /**
   * Audit single blog post SEO
   */
  async auditBlogPost(postId) {
    try {
      const post = await BlogPost.findById(postId);
      
      if (!post) {
        throw new AppError('Blog post not found', 404, 'POST_NOT_FOUND');
      }

      // Validate SEO fields
      const validation = seoValidator.validateSeoFields(post, 'post');

      // Check for duplicate slug
      const slugCheck = await seoValidator.checkDuplicateSlug(
        post.slug,
        BlogPost,
        post._id
      );

      // Analyze keyword usage
      let keywordAnalysis = null;
      if (post.seo?.keywords && post.seo.keywords.length > 0) {
        keywordAnalysis = seoValidator.analyzeKeywordUsage(
          post.content,
          post.seo.keywords
        );
      }

      // Generate recommendations
      const recommendations = seoValidator.generateRecommendations(post, 'post');

      // Get SEO grade
      const grade = seoValidator.getSeoGrade(validation.score);

      return {
        postId: post._id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        validation,
        slugCheck,
        keywordAnalysis,
        recommendations,
        grade,
        lastAudited: new Date()
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to audit blog post SEO', 500, 'AUDIT_ERROR');
    }
  }

  /**
   * Audit single blog category SEO
   */
  async auditBlogCategory(categoryId) {
    try {
      const category = await BlogCategory.findById(categoryId);
      
      if (!category) {
        throw new AppError('Blog category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Validate SEO fields
      const validation = seoValidator.validateSeoFields(category, 'category');

      // Check for duplicate slug
      const slugCheck = await seoValidator.checkDuplicateSlug(
        category.slug,
        BlogCategory,
        category._id
      );

      // Generate recommendations
      const recommendations = seoValidator.generateRecommendations(category, 'category');

      // Get SEO grade
      const grade = seoValidator.getSeoGrade(validation.score);

      return {
        categoryId: category._id,
        name: category.name,
        slug: category.slug,
        status: category.status,
        validation,
        slugCheck,
        recommendations,
        grade,
        lastAudited: new Date()
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to audit blog category SEO', 500, 'AUDIT_ERROR');
    }
  }

  /**
   * Audit all blog posts - Dashboard overview
   */
  async auditAllBlogPosts(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.categoryId) query.categoryId = filters.categoryId;

      const posts = await BlogPost.find(query).select(
        'title slug status seo featuredImage excerpt content tags'
      );

      const audits = [];
      const summary = {
        totalPosts: posts.length,
        excellent: 0,
        good: 0,
        needsImprovement: 0,
        poor: 0,
        criticalIssues: 0,
        missingMetaDescriptions: 0,
        missingOgImages: 0,
        duplicateSlugs: 0,
        missingKeywords: 0
      };

      for (const post of posts) {
        const validation = seoValidator.validateSeoFields(post, 'post');
        const grade = seoValidator.getSeoGrade(validation.score);

        // Update summary counts
        if (validation.score >= 90) summary.excellent++;
        else if (validation.score >= 70) summary.good++;
        else if (validation.score >= 50) summary.needsImprovement++;
        else summary.poor++;

        if (validation.issues.length > 0) summary.criticalIssues++;
        
        if (!post.seo?.description) summary.missingMetaDescriptions++;
        if (!post.seo?.ogImage?.url && !post.featuredImage?.url) summary.missingOgImages++;
        if (!post.seo?.keywords || post.seo.keywords.length === 0) summary.missingKeywords++;

        audits.push({
          postId: post._id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          score: validation.score,
          grade: grade.grade,
          issueCount: validation.issues.length,
          warningCount: validation.warnings.length,
          topIssues: validation.issues.slice(0, 3)
        });
      }

      // Check for duplicate slugs
      const slugMap = new Map();
      posts.forEach(post => {
        if (slugMap.has(post.slug)) {
          summary.duplicateSlugs++;
          slugMap.get(post.slug).push(post._id);
        } else {
          slugMap.set(post.slug, [post._id]);
        }
      });

      const duplicateSlugs = Array.from(slugMap.entries())
        .filter(([slug, ids]) => ids.length > 1)
        .map(([slug, ids]) => ({ slug, postIds: ids, count: ids.length }));

      // Sort by score (worst first)
      audits.sort((a, b) => a.score - b.score);

      return {
        summary,
        duplicateSlugs,
        audits,
        auditedAt: new Date()
      };
    } catch (error) {
      throw new AppError('Failed to audit all blog posts', 500, 'AUDIT_ERROR');
    }
  }

  /**
   * Audit all blog categories - Dashboard overview
   */
  async auditAllBlogCategories() {
    try {
      const categories = await BlogCategory.find({}).select(
        'name slug status seo image description'
      );

      const audits = [];
      const summary = {
        totalCategories: categories.length,
        excellent: 0,
        good: 0,
        needsImprovement: 0,
        poor: 0,
        criticalIssues: 0,
        missingMetaDescriptions: 0,
        missingKeywords: 0,
        duplicateSlugs: 0
      };

      for (const category of categories) {
        const validation = seoValidator.validateSeoFields(category, 'category');
        const grade = seoValidator.getSeoGrade(validation.score);

        // Update summary counts
        if (validation.score >= 90) summary.excellent++;
        else if (validation.score >= 70) summary.good++;
        else if (validation.score >= 50) summary.needsImprovement++;
        else summary.poor++;

        if (validation.issues.length > 0) summary.criticalIssues++;
        
        if (!category.seoDescription) summary.missingMetaDescriptions++;
        if (!category.seoKeywords || category.seoKeywords.length === 0) summary.missingKeywords++;

        audits.push({
          categoryId: category._id,
          name: category.name,
          slug: category.slug,
          status: category.status,
          score: validation.score,
          grade: grade.grade,
          issueCount: validation.issues.length,
          warningCount: validation.warnings.length,
          topIssues: validation.issues.slice(0, 3)
        });
      }

      // Check for duplicate slugs
      const slugMap = new Map();
      categories.forEach(category => {
        if (slugMap.has(category.slug)) {
          summary.duplicateSlugs++;
          slugMap.get(category.slug).push(category._id);
        } else {
          slugMap.set(category.slug, [category._id]);
        }
      });

      const duplicateSlugs = Array.from(slugMap.entries())
        .filter(([slug, ids]) => ids.length > 1)
        .map(([slug, ids]) => ({ slug, categoryIds: ids, count: ids.length }));

      // Sort by score (worst first)
      audits.sort((a, b) => a.score - b.score);

      return {
        summary,
        duplicateSlugs,
        audits,
        auditedAt: new Date()
      };
    } catch (error) {
      throw new AppError('Failed to audit all blog categories', 500, 'AUDIT_ERROR');
    }
  }

  /**
   * Get SEO issues that need immediate attention
   */
  async getCriticalSeoIssues() {
    try {
      const posts = await BlogPost.find({
        status: { $in: ['published', 'draft'] }
      }).select('title slug status seo featuredImage');

      const criticalIssues = [];

      for (const post of posts) {
        const issues = [];

        // Missing meta description
        if (!post.seo?.description) {
          issues.push({
            type: 'missing_meta_description',
            severity: 'high',
            message: 'Meta description is missing'
          });
        }

        // Missing OG image
        if (!post.seo?.ogImage?.url && !post.featuredImage?.url) {
          issues.push({
            type: 'missing_og_image',
            severity: 'high',
            message: 'Open Graph image is missing'
          });
        }

        // Missing SEO title
        if (!post.seo?.title) {
          issues.push({
            type: 'missing_seo_title',
            severity: 'high',
            message: 'SEO title is missing'
          });
        }

        if (issues.length > 0) {
          criticalIssues.push({
            postId: post._id,
            title: post.title,
            slug: post.slug,
            status: post.status,
            issues
          });
        }
      }

      return {
        totalCriticalIssues: criticalIssues.length,
        issues: criticalIssues
      };
    } catch (error) {
      throw new AppError('Failed to get critical SEO issues', 500, 'AUDIT_ERROR');
    }
  }

  /**
   * Get posts with duplicate slugs
   */
  async getDuplicateSlugs() {
    try {
      const duplicates = await BlogPost.aggregate([
        {
          $group: {
            _id: '$slug',
            count: { $sum: 1 },
            posts: {
              $push: {
                id: '$_id',
                title: '$title',
                status: '$status'
              }
            }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        },
        {
          $project: {
            slug: '$_id',
            count: 1,
            posts: 1,
            _id: 0
          }
        }
      ]);

      return {
        totalDuplicates: duplicates.length,
        duplicates
      };
    } catch (error) {
      throw new AppError('Failed to find duplicate slugs', 500, 'AUDIT_ERROR');
    }
  }
}

module.exports = new SeoAuditService();