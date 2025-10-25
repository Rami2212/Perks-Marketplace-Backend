class PaginationUtils {
  // Calculate pagination metadata
  calculatePagination(page, limit, totalItems) {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const offset = (currentPage - 1) * itemsPerPage;

    return {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      offset,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      nextPage: currentPage < totalPages ? currentPage + 1 : null,
      prevPage: currentPage > 1 ? currentPage - 1 : null,
      startItem: Math.min(offset + 1, totalItems),
      endItem: Math.min(offset + itemsPerPage, totalItems)
    };
  }

  // Create pagination response
  createPaginationResponse(data, page, limit, totalItems) {
    const pagination = this.calculatePagination(page, limit, totalItems);
    
    return {
      data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
        nextPage: pagination.nextPage,
        prevPage: pagination.prevPage
      },
      meta: {
        showing: `${pagination.startItem}-${pagination.endItem} of ${totalItems}`,
        first: 1,
        last: pagination.totalPages
      }
    };
  }

  // Generate page links
  generatePageLinks(baseUrl, page, limit, totalItems, maxLinks = 5) {
    const pagination = this.calculatePagination(page, limit, totalItems);
    const links = [];

    // Calculate start and end page numbers
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxLinks / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxLinks - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxLinks) {
      startPage = Math.max(1, endPage - maxLinks + 1);
    }

    // Previous link
    if (pagination.hasPrev) {
      links.push({
        page: pagination.prevPage,
        url: this.buildPageUrl(baseUrl, pagination.prevPage, limit),
        label: 'Previous',
        active: false
      });
    }

    // First page link
    if (startPage > 1) {
      links.push({
        page: 1,
        url: this.buildPageUrl(baseUrl, 1, limit),
        label: '1',
        active: false
      });

      if (startPage > 2) {
        links.push({
          page: null,
          url: null,
          label: '...',
          active: false
        });
      }
    }

    // Page number links
    for (let i = startPage; i <= endPage; i++) {
      links.push({
        page: i,
        url: this.buildPageUrl(baseUrl, i, limit),
        label: i.toString(),
        active: i === pagination.currentPage
      });
    }

    // Last page link
    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        links.push({
          page: null,
          url: null,
          label: '...',
          active: false
        });
      }

      links.push({
        page: pagination.totalPages,
        url: this.buildPageUrl(baseUrl, pagination.totalPages, limit),
        label: pagination.totalPages.toString(),
        active: false
      });
    }

    // Next link
    if (pagination.hasNext) {
      links.push({
        page: pagination.nextPage,
        url: this.buildPageUrl(baseUrl, pagination.nextPage, limit),
        label: 'Next',
        active: false
      });
    }

    return links;
  }

  // Build page URL
  buildPageUrl(baseUrl, page, limit, additionalParams = {}) {
    const url = new URL(baseUrl, 'http://localhost'); // Base URL for parsing
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', limit.toString());

    // Add additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value.toString());
      }
    });

    return url.pathname + url.search;
  }

  // Create cursor-based pagination
  createCursorPagination(data, cursor, limit, getCursorFn) {
    const hasNext = data.length > limit;
    const items = hasNext ? data.slice(0, -1) : data;
    
    let nextCursor = null;
    if (hasNext && items.length > 0) {
      nextCursor = getCursorFn(items[items.length - 1]);
    }

    return {
      data: items,
      pagination: {
        cursor,
        nextCursor,
        hasNext,
        limit
      }
    };
  }

  // Validate pagination parameters
  validatePaginationParams(page, limit, maxLimit = 100) {
    const errors = [];

    // Validate page
    const pageNum = parseInt(page);
    if (page && (isNaN(pageNum) || pageNum < 1)) {
      errors.push('Page must be a positive integer');
    }

    // Validate limit
    const limitNum = parseInt(limit);
    if (limit && (isNaN(limitNum) || limitNum < 1)) {
      errors.push('Limit must be a positive integer');
    }

    if (limit && limitNum > maxLimit) {
      errors.push(`Limit cannot exceed ${maxLimit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      page: Math.max(1, pageNum || 1),
      limit: Math.max(1, Math.min(maxLimit, limitNum || 10))
    };
  }

  // Create MongoDB aggregation pagination
  createAggregationPagination(page, limit) {
    const pagination = this.calculatePagination(page, limit, 0);
    
    return [
      {
        $facet: {
          data: [
            { $skip: pagination.offset },
            { $limit: pagination.itemsPerPage }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      },
      {
        $project: {
          data: 1,
          totalItems: { $arrayElemAt: ['$totalCount.count', 0] },
          currentPage: { $literal: pagination.currentPage },
          itemsPerPage: { $literal: pagination.itemsPerPage }
        }
      }
    ];
  }

  // Create infinite scroll pagination
  createInfiniteScrollPagination(data, offset, limit) {
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, -1) : data;
    
    return {
      data: items,
      pagination: {
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + limit : null
      }
    };
  }

  // Calculate pagination stats
  calculatePaginationStats(currentPage, totalPages, totalItems, itemsPerPage) {
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    const percentage = totalItems > 0 ? Math.round((endItem / totalItems) * 100) : 0;

    return {
      startItem,
      endItem,
      percentage,
      remaining: totalItems - endItem,
      itemsOnCurrentPage: endItem - startItem + 1
    };
  }

  // Create SEO-friendly pagination URLs
  createSeoFriendlyUrls(baseUrl, currentPage, totalPages, maxLinks = 5) {
    const urls = {
      canonical: this.buildPageUrl(baseUrl, currentPage, 0),
      prev: currentPage > 1 ? this.buildPageUrl(baseUrl, currentPage - 1, 0) : null,
      next: currentPage < totalPages ? this.buildPageUrl(baseUrl, currentPage + 1, 0) : null,
      first: this.buildPageUrl(baseUrl, 1, 0),
      last: this.buildPageUrl(baseUrl, totalPages, 0)
    };

    return urls;
  }

  // Optimize pagination for performance
  optimizeForPerformance(query, page, limit, sortField = '_id') {
    const optimizations = {
      useIndex: true,
      indexHint: sortField,
      projection: null,
      batchSize: limit
    };

    // For large offsets, suggest cursor-based pagination
    if (page * limit > 10000) {
      optimizations.suggestCursorPagination = true;
      optimizations.reason = 'Large offset detected, cursor-based pagination recommended for better performance';
    }

    return optimizations;
  }
}

module.exports = new PaginationUtils();