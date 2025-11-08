const dashboardService = require('../services/dashboardService');
const { validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');

class DashboardController {
  // Get complete dashboard overview
  getDashboardOverview = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    let dateRange = {};
    
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    } else {
      // Set default date range based on period
      const now = new Date();
      switch (period) {
        case '7d':
          dateRange.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateRange.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateRange.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateRange.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      dateRange.endDate = now;
    }

    const dashboard = await dashboardService.getDashboardOverview(dateRange);

    res.status(200).json({
      success: true,
      data: dashboard,
      meta: {
        period,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get perk analytics
  getPerkAnalytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const analytics = await dashboardService.getPerkAnalytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get category analytics
  getCategoryAnalytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const analytics = await dashboardService.getCategoryAnalytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get lead analytics
  getLeadAnalytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const analytics = await dashboardService.getLeadAnalytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get Google Analytics data
  getGA4Analytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const analytics = await dashboardService.getGA4Analytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get blog analytics (placeholder)
  getBlogAnalytics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const analytics = await dashboardService.getBlogAnalytics(dateRange);

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString(),
      }
    });
  });

  // Get recent activity
  getRecentActivity = catchAsync(async (req, res) => {
    const { limit = 20 } = req.query;

    const activity = await dashboardService.getRecentActivity(parseInt(limit));

    res.status(200).json({
      success: true,
      data: activity,
      meta: {
        limit: parseInt(limit),
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get performance metrics
  getPerformanceMetrics = catchAsync(async (req, res) => {
    const {
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    const metrics = await dashboardService.getPerformanceMetrics(dateRange);

    res.status(200).json({
      success: true,
      data: metrics,
      meta: {
        period,
        dateRange,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Get analytics summary (lightweight version for widgets)
  getAnalyticsSummary = catchAsync(async (req, res) => {
    const { period = '7d' } = req.query;
    const dateRange = this.parseDateRange(null, null, period);

    const [
      perkSummary,
      leadSummary,
      gaSummary
    ] = await Promise.all([
      dashboardService.getPerkAnalytics(dateRange).then(data => data.overview),
      dashboardService.getLeadAnalytics(dateRange).then(data => data.overview),
      dashboardService.getGA4Analytics(dateRange).then(data => ({
        activeUsers: data.activeUsers,
        sessions: data.sessions,
        pageViews: data.pageViews
      }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        perks: perkSummary,
        leads: leadSummary,
        traffic: gaSummary
      },
      meta: {
        period,
        generatedAt: new Date().toISOString()
      }
    });
  });

  // Export analytics data
  exportAnalytics = catchAsync(async (req, res) => {
    const {
      format = 'json',
      module = 'overview',
      startDate,
      endDate,
      period = '30d'
    } = req.query;

    const dateRange = this.parseDateRange(startDate, endDate, period);
    let data;

    switch (module) {
      case 'perks':
        data = await dashboardService.getPerkAnalytics(dateRange);
        break;
      case 'categories':
        data = await dashboardService.getCategoryAnalytics(dateRange);
        break;
      case 'leads':
        data = await dashboardService.getLeadAnalytics(dateRange);
        break;
      case 'ga4':
        data = await dashboardService.getGA4Analytics(dateRange);
        break;
      case 'overview':
      default:
        data = await dashboardService.getDashboardOverview(dateRange);
        break;
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(data, module);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${module}-analytics-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: data,
      meta: {
        format,
        module,
        period,
        dateRange,
        exportedAt: new Date().toISOString()
      }
    });
  });

  // Helper method to parse date range
  parseDateRange(startDate, endDate, period) {
    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    }

    const now = new Date();
    let daysBack;

    switch (period) {
      case '1d':
        daysBack = 1;
        break;
      case '7d':
        daysBack = 7;
        break;
      case '30d':
        daysBack = 30;
        break;
      case '90d':
        daysBack = 90;
        break;
      case '365d':
        daysBack = 365;
        break;
      default:
        daysBack = 30;
    }

    return {
      startDate: new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000),
      endDate: now
    };
  }

  // Helper method to convert data to CSV
  convertToCSV(data, module) {
    try {
      let rows = [];
      
      switch (module) {
        case 'perks':
          rows = [
            ['Metric', 'Value'],
            ['Total Perks', data.overview.total],
            ['Active Perks', data.overview.active],
            ['Pending Perks', data.overview.pending],
            ['Total Views', data.overview.totalViews],
            ['Total Clicks', data.overview.totalClicks],
            ['Average Conversion Rate', data.overview.avgConversionRate]
          ];
          break;
        
        case 'leads':
          rows = [
            ['Metric', 'Value'],
            ['Total Leads', data.overview.total],
            ['Converted Leads', data.overview.converted],
            ['Conversion Rate', data.overview.conversionRate + '%'],
            ['Average Score', data.overview.avgLeadScore],
            ['Total Value', data.overview.totalValue]
          ];
          break;
        
        default:
          rows = [
            ['Module', 'Metric', 'Value'],
            ['Perks', 'Total', data.summary.totalPerks],
            ['Categories', 'Total', data.summary.totalCategories],
            ['Leads', 'Total', data.summary.totalLeads],
            ['Traffic', 'Active Users', data.summary.activeUsers],
            ['Traffic', 'Page Views', data.summary.pageViews]
          ];
      }

      return rows.map(row => row.join(',')).join('\n');
    } catch (error) {
      console.error('CSV conversion error:', error);
      return 'Error generating CSV';
    }
  }
}

module.exports = new DashboardController();