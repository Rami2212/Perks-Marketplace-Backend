// utils/seoValidator.js

class SeoValidator {
  /**
   * Validate SEO fields for a blog post or category
   */
  validateSeoFields(entity, type = 'post') {
    const issues = [];
    const warnings = [];
    const recommendations = [];
    let score = 100;

    // Check SEO Title
    if (!entity.seo?.title) {
      issues.push({
        field: 'seo.title',
        severity: 'error',
        message: 'SEO title is missing',
        impact: 'high'
      });
      score -= 15;
    } else {
      const titleLength = entity.seo.title.length;
      if (titleLength < 30) {
        warnings.push({
          field: 'seo.title',
          severity: 'warning',
          message: `SEO title is too short (${titleLength} chars). Recommended: 50-60 characters`,
          impact: 'medium'
        });
        score -= 5;
      } else if (titleLength > 60) {
        warnings.push({
          field: 'seo.title',
          severity: 'warning',
          message: `SEO title is too long (${titleLength} chars). It will be truncated in search results`,
          impact: 'medium'
        });
        score -= 5;
      }
    }

    // Check Meta Description
    if (!entity.seo?.description) {
      issues.push({
        field: 'seo.description',
        severity: 'error',
        message: 'Meta description is missing',
        impact: 'high'
      });
      score -= 15;
    } else {
      const descLength = entity.seo.description.length;
      if (descLength < 120) {
        warnings.push({
          field: 'seo.description',
          severity: 'warning',
          message: `Meta description is too short (${descLength} chars). Recommended: 150-160 characters`,
          impact: 'medium'
        });
        score -= 5;
      } else if (descLength > 160) {
        warnings.push({
          field: 'seo.description',
          severity: 'warning',
          message: `Meta description is too long (${descLength} chars). It will be truncated in search results`,
          impact: 'medium'
        });
        score -= 5;
      }
    }

    // Check OG Title
    if (!entity.seo?.ogTitle) {
      warnings.push({
        field: 'seo.ogTitle',
        severity: 'warning',
        message: 'Open Graph title is missing. Using SEO title as fallback',
        impact: 'low'
      });
      score -= 3;
    }

    // Check OG Description
    if (!entity.seo?.ogDescription) {
      warnings.push({
        field: 'seo.ogDescription',
        severity: 'warning',
        message: 'Open Graph description is missing. Using meta description as fallback',
        impact: 'low'
      });
      score -= 3;
    }

    // Check OG Image (only for posts)
    if (type === 'post') {
      if (!entity.seo?.ogImage?.url && !entity.featuredImage?.url) {
        issues.push({
          field: 'seo.ogImage',
          severity: 'error',
          message: 'Open Graph image is missing. Required for proper social media sharing',
          impact: 'high'
        });
        score -= 15;
      } else if (!entity.seo?.ogImage?.url && entity.featuredImage?.url) {
        recommendations.push({
          field: 'seo.ogImage',
          severity: 'info',
          message: 'Using featured image as OG image. Consider optimizing a specific image for social sharing (1200x630px)',
          impact: 'low'
        });
      }
    }

    // Check Keywords
    if (!entity.seo?.keywords || entity.seo.keywords.length === 0) {
      warnings.push({
        field: 'seo.keywords',
        severity: 'warning',
        message: 'No SEO keywords defined',
        impact: 'medium'
      });
      score -= 5;
    } else if (entity.seo.keywords.length < 3) {
      recommendations.push({
        field: 'seo.keywords',
        severity: 'info',
        message: `Only ${entity.seo.keywords.length} keywords defined. Recommended: 3-5 keywords`,
        impact: 'low'
      });
      score -= 2;
    } else if (entity.seo.keywords.length > 10) {
      warnings.push({
        field: 'seo.keywords',
        severity: 'warning',
        message: `Too many keywords (${entity.seo.keywords.length}). Focus on 3-5 most important keywords`,
        impact: 'low'
      });
      score -= 3;
    }

    // Check Canonical URL
    if (entity.seo?.canonicalUrl) {
      if (!this.isValidUrl(entity.seo.canonicalUrl)) {
        issues.push({
          field: 'seo.canonicalUrl',
          severity: 'error',
          message: 'Canonical URL is not a valid URL',
          impact: 'medium'
        });
        score -= 10;
      }
    }

    // Check Slug
    if (!entity.slug) {
      issues.push({
        field: 'slug',
        severity: 'error',
        message: 'URL slug is missing',
        impact: 'high'
      });
      score -= 15;
    } else {
      if (entity.slug.length > 60) {
        warnings.push({
          field: 'slug',
          severity: 'warning',
          message: `Slug is too long (${entity.slug.length} chars). Recommended: under 60 characters`,
          impact: 'low'
        });
        score -= 3;
      }
      
      // Check slug readability
      const wordCount = entity.slug.split('-').length;
      if (wordCount > 10) {
        recommendations.push({
          field: 'slug',
          severity: 'info',
          message: 'Slug contains many words. Consider making it more concise',
          impact: 'low'
        });
      }
    }

    // Post-specific checks
    if (type === 'post') {
      // Check content length
      if (entity.content) {
        const wordCount = this.countWords(entity.content);
        if (wordCount < 300) {
          warnings.push({
            field: 'content',
            severity: 'warning',
            message: `Content is short (${wordCount} words). Recommended: at least 300 words for better SEO`,
            impact: 'medium'
          });
          score -= 5;
        } else if (wordCount > 2000) {
          recommendations.push({
            field: 'content',
            severity: 'info',
            message: `Content is lengthy (${wordCount} words). Consider breaking into multiple posts or adding a table of contents`,
            impact: 'low'
          });
        }
      }

      // Check excerpt
      if (!entity.excerpt || entity.excerpt.length < 100) {
        warnings.push({
          field: 'excerpt',
          severity: 'warning',
          message: 'Excerpt is too short or missing. It should be compelling and at least 100 characters',
          impact: 'medium'
        });
        score -= 5;
      }

      // Check tags
      if (!entity.tags || entity.tags.length === 0) {
        warnings.push({
          field: 'tags',
          severity: 'warning',
          message: 'No tags defined. Tags help with content discovery and internal linking',
          impact: 'low'
        });
        score -= 3;
      }

      // Check featured image
      if (!entity.featuredImage?.url) {
        warnings.push({
          field: 'featuredImage',
          severity: 'warning',
          message: 'Featured image is missing. Images improve engagement and social sharing',
          impact: 'medium'
        });
        score -= 5;
      }

      // Check alt text for featured image
      if (entity.featuredImage?.url && !entity.featuredImage?.alt) {
        warnings.push({
          field: 'featuredImage.alt',
          severity: 'warning',
          message: 'Featured image is missing alt text. Important for accessibility and SEO',
          impact: 'medium'
        });
        score -= 5;
      }
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Determine overall status
    let status = 'excellent';
    if (score < 50) {
      status = 'poor';
    } else if (score < 70) {
      status = 'needs-improvement';
    } else if (score < 90) {
      status = 'good';
    }

    return {
      score,
      status,
      issues,
      warnings,
      recommendations,
      summary: {
        totalIssues: issues.length,
        totalWarnings: warnings.length,
        totalRecommendations: recommendations.length
      }
    };
  }

  /**
   * Check for duplicate slugs
   */
  async checkDuplicateSlug(slug, Model, excludeId = null) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const duplicate = await Model.findOne(query);
    
    if (duplicate) {
      return {
        isDuplicate: true,
        duplicateId: duplicate._id,
        message: 'This slug is already in use by another document'
      };
    }

    return {
      isDuplicate: false,
      message: 'Slug is unique'
    };
  }

  /**
   * Analyze keyword usage in content
   */
  analyzeKeywordUsage(content, keywords) {
    if (!keywords || keywords.length === 0) {
      return {
        analysis: 'No keywords defined',
        usage: []
      };
    }

    const cleanContent = this.stripHtml(content).toLowerCase();
    const wordCount = this.countWords(content);
    
    const usage = keywords.map(keyword => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${this.escapeRegex(keywordLower)}\\b`, 'gi');
      const matches = cleanContent.match(regex) || [];
      const count = matches.length;
      const density = wordCount > 0 ? ((count / wordCount) * 100).toFixed(2) : 0;

      let status = 'good';
      let message = 'Keyword usage is optimal';

      if (count === 0) {
        status = 'missing';
        message = 'Keyword not found in content';
      } else if (density < 0.5) {
        status = 'low';
        message = 'Keyword density is low. Consider using it more naturally';
      } else if (density > 3) {
        status = 'high';
        message = 'Keyword density is high. Avoid keyword stuffing';
      }

      return {
        keyword,
        count,
        density: parseFloat(density),
        status,
        message
      };
    });

    return {
      analysis: 'Keyword analysis complete',
      usage,
      totalWordCount: wordCount
    };
  }

  /**
   * Generate SEO recommendations based on content
   */
  generateRecommendations(entity, type = 'post') {
    const recommendations = [];

    // Title optimization
    if (entity.title && entity.seo?.keywords?.length > 0) {
      const titleLower = entity.title.toLowerCase();
      const keywordsInTitle = entity.seo.keywords.filter(k => 
        titleLower.includes(k.toLowerCase())
      );

      if (keywordsInTitle.length === 0) {
        recommendations.push({
          type: 'title',
          priority: 'high',
          message: 'Consider including one of your target keywords in the title'
        });
      }
    }

    // URL optimization
    if (entity.slug && entity.seo?.keywords?.length > 0) {
      const slugLower = entity.slug.toLowerCase();
      const keywordsInSlug = entity.seo.keywords.filter(k => 
        slugLower.includes(k.toLowerCase())
      );

      if (keywordsInSlug.length === 0) {
        recommendations.push({
          type: 'slug',
          priority: 'medium',
          message: 'Consider including your primary keyword in the URL slug'
        });
      }
    }

    // Meta description optimization
    if (entity.seo?.description && entity.seo?.keywords?.length > 0) {
      const descLower = entity.seo.description.toLowerCase();
      const keywordsInDesc = entity.seo.keywords.filter(k => 
        descLower.includes(k.toLowerCase())
      );

      if (keywordsInDesc.length === 0) {
        recommendations.push({
          type: 'description',
          priority: 'medium',
          message: 'Include your primary keyword in the meta description'
        });
      }
    }

    // Call-to-action in meta description
    if (entity.seo?.description) {
      const ctaWords = ['learn', 'discover', 'find out', 'get', 'download', 'read', 'explore'];
      const hasCTA = ctaWords.some(word => 
        entity.seo.description.toLowerCase().includes(word)
      );

      if (!hasCTA) {
        recommendations.push({
          type: 'description',
          priority: 'low',
          message: 'Add a call-to-action in your meta description (e.g., "Learn more", "Discover how")'
        });
      }
    }

    // Internal linking (for posts)
    if (type === 'post' && entity.content) {
      const linkCount = (entity.content.match(/<a /gi) || []).length;
      
      if (linkCount === 0) {
        recommendations.push({
          type: 'content',
          priority: 'medium',
          message: 'Add internal links to other relevant blog posts to improve SEO and user engagement'
        });
      }
    }

    // Image optimization
    if (type === 'post') {
      const imageCount = (entity.content?.match(/<img /gi) || []).length;
      
      if (imageCount === 0 && !entity.featuredImage?.url) {
        recommendations.push({
          type: 'images',
          priority: 'medium',
          message: 'Add images to make content more engaging and improve SEO'
        });
      }

      if (imageCount > 0) {
        const altTextCount = (entity.content?.match(/alt="/gi) || []).length;
        
        if (altTextCount < imageCount) {
          recommendations.push({
            type: 'images',
            priority: 'high',
            message: 'Some images are missing alt text. Add descriptive alt text for better accessibility and SEO'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Helper: Strip HTML tags from content
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Helper: Count words in text
   */
  countWords(text) {
    if (!text) return 0;
    const cleanText = this.stripHtml(text);
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Helper: Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get SEO grade based on score
   */
  getSeoGrade(score) {
    if (score >= 90) return { grade: 'A', color: 'green', label: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: 'blue', label: 'Good' };
    if (score >= 70) return { grade: 'C', color: 'yellow', label: 'Fair' };
    if (score >= 60) return { grade: 'D', color: 'orange', label: 'Needs Improvement' };
    return { grade: 'F', color: 'red', label: 'Poor' };
  }
}

module.exports = new SeoValidator();