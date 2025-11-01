const slugifyLib = require('slugify');

class SlugifyUtils {
  constructor() {
    this.defaultOptions = {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    };
  }

  // Basic slugify
  slugify(text, options = {}) {
    if (!text) return '';
    
    const mergedOptions = { ...this.defaultOptions, ...options };
    return slugifyLib(text, mergedOptions);
  }

  // Create URL-safe slug
  createUrlSlug(text) {
    return this.slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@#$%^&*]/g
    });
  }

  // Create filename-safe slug
  createFilenameSlug(text) {
    return this.slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@#$%^&*<>?\/\\|]/g
    });
  }

  // Create SEO-friendly slug
  createSeoSlug(text, maxLength = 60) {
    let slug = this.slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@#$%^&*]/g
    });

    // Truncate if too long
    if (slug.length > maxLength) {
      slug = slug.substring(0, maxLength);
      // Remove partial word at the end
      const lastDash = slug.lastIndexOf('-');
      if (lastDash > maxLength * 0.8) {
        slug = slug.substring(0, lastDash);
      }
    }

    return slug;
  }

  // Create unique slug (append number if needed)
  async createUniqueSlug(text, checkFunction, maxLength = 60) {
    let baseSlug = this.createSeoSlug(text, maxLength);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug already exists
    while (await checkFunction(slug)) {
      const suffix = `-${counter}`;
      const maxBaseLength = maxLength - suffix.length;
      
      if (baseSlug.length > maxBaseLength) {
        slug = baseSlug.substring(0, maxBaseLength) + suffix;
      } else {
        slug = baseSlug + suffix;
      }
      
      counter++;
    }

    return slug;
  }

  // Validate slug format
  isValidSlug(slug) {
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugPattern.test(slug);
  }

  // Clean and validate slug
  cleanSlug(slug) {
    if (!slug) return '';
    
    // Remove invalid characters and create proper slug
    const cleaned = this.slugify(slug);
    
    // Ensure it doesn't start or end with hyphens
    return cleaned.replace(/^-+|-+$/g, '');
  }

  // Generate slug from multiple fields
  generateSlugFromFields(fields, separator = '-') {
    const validFields = fields.filter(field => field && field.trim());
    const combinedText = validFields.join(' ' + separator + ' ');
    return this.slugify(combinedText);
  }

  // Create slug with category prefix
  createCategorySlug(category, title) {
    const categorySlug = this.slugify(category);
    const titleSlug = this.slugify(title);
    return `${categorySlug}-${titleSlug}`;
  }

  // Create date-based slug
  createDateSlug(title, date = new Date()) {
    const dateUtils = require('./dateUtils');
    const dateString = dateUtils.format(date, 'YYYY-MM-DD');
    const titleSlug = this.slugify(title);
    return `${dateString}-${titleSlug}`;
  }

  // Extract words from slug
  extractWordsFromSlug(slug) {
    return slug.split('-').filter(word => word.length > 0);
  }

  // Create breadcrumb from slug
  createBreadcrumbFromSlug(slug) {
    return this.extractWordsFromSlug(slug)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Reverse slugify (convert slug back to readable text)
  reverseSlugify(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Create random slug
  createRandomSlug(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Create short slug (for IDs)
  createShortSlug(text, length = 6) {
    const slug = this.slugify(text);
    const words = slug.split('-');
    
    if (words.length === 1) {
      return words[0].substring(0, length);
    }
    
    // Take first letter of each word
    let result = words.map(word => word.charAt(0)).join('');
    
    // If still too long, truncate
    if (result.length > length) {
      result = result.substring(0, length);
    }
    
    // If too short, add more characters from the first word
    if (result.length < length && words[0].length > 1) {
      const needed = length - result.length;
      result += words[0].substring(1, 1 + needed);
    }
    
    return result;
  }

  // Suggest alternative slugs
  suggestAlternativeSlugS(text, count = 5) {
    const baseSlug = this.slugify(text);
    const suggestions = [baseSlug];
    
    // Add numbered variations
    for (let i = 1; i < count; i++) {
      suggestions.push(`${baseSlug}-${i}`);
    }
    
    // Add random suffix variations
    for (let i = 0; i < 2; i++) {
      const randomSuffix = this.createRandomSlug(4);
      suggestions.push(`${baseSlug}-${randomSuffix}`);
    }
    
    return suggestions.slice(0, count);
  }

  // Optimize slug for SEO
  optimizeForSeo(text, keywords = []) {
    let slug = this.slugify(text);
    
    // Ensure important keywords are at the beginning if possible
    if (keywords.length > 0) {
      const keywordSlugs = keywords.map(keyword => this.slugify(keyword));
      const words = slug.split('-');
      
      // Move keyword to front if it exists in the slug
      for (const keywordSlug of keywordSlugs) {
        if (words.includes(keywordSlug)) {
          const index = words.indexOf(keywordSlug);
          words.splice(index, 1); // Remove from current position
          words.unshift(keywordSlug); // Add to beginning
          slug = words.join('-');
          break;
        }
      }
    }
    
    return slug;
  }

  // Create hierarchical slug
  createHierarchicalSlug(hierarchy) {
    return hierarchy
      .filter(item => item && item.trim())
      .map(item => this.slugify(item))
      .join('/');
  }
}

module.exports = new SlugifyUtils();