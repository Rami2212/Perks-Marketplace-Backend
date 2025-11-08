const perkService = require('./perkService');
const categoryService = require('./categoryService');
const leadService = require('./leadService');
const analyticsService = require('./analyticsService');
const perkRepository = require('../repositories/perkRepository');
const categoryRepository = require('../repositories/categoryRepository');
const leadRepository = require('../repositories/leadRepository');
const blogRepository = require('../repositories/blogRepository');
const { AppError } = require('../middleware/errorHandler');

class DashboardService {
    // Get complete dashboard overview
    async getDashboardOverview(dateRange = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate = new Date()
            } = dateRange;

            const [perkStats, categoryStats, leadStats, recentActivity] = await Promise.all([
                this.getPerkAnalytics(dateRange),
                this.getCategoryAnalytics(dateRange),
                this.getLeadAnalytics(dateRange),
                this.getRecentActivity()
            ]);

            return {
                summary: {
                    totalPerks: perkStats.overview.total,
                    totalCategories: categoryStats.overview.total,
                    totalLeads: leadStats.overview.total,
                    conversionRate: leadStats.overview.conversionRate || 0
                },
                perks: perkStats,
                categories: categoryStats,
                leads: leadStats,
                recentActivity,
                dateRange: { startDate, endDate }
            };
        } catch (error) {
            console.error('Dashboard Overview Error:', error);
            throw new AppError(
                `Failed to get dashboard overview: ${error.message}`,
                500,
                'DASHBOARD_OVERVIEW_ERROR'
            );
        }
    }


    // Get comprehensive perk analytics
    async getPerkAnalytics(dateRange = {}) {
        try {
            const [
                perkStats,
                topPerks,
                perksByCategory,
                perksByStatus,
                recentPerks,
                expiringPerks,
                conversionData
            ] = await Promise.all([
                perkRepository.getStats(dateRange),
                this.getTopPerformingPerks(dateRange),
                this.getPerksByCategory(dateRange),
                this.getPerksByStatus(),
                this.getRecentPerks(7),
                this.getExpiringPerks(30),
                this.getPerkConversions(dateRange)
            ]);

            return {
                overview: {
                    total: perkStats.total || 0,
                    active: perkStats.active || 0,
                    pending: perkStats.pending || 0,
                    rejected: perkStats.rejected || 0,
                    featured: perkStats.featured || 0,
                    exclusive: perkStats.exclusive || 0,
                    totalViews: perkStats.totalViews || 0,
                    totalClicks: perkStats.totalClicks || 0,
                    totalRedemptions: perkStats.totalRedemptions || 0,
                    avgConversionRate: perkStats.avgConversionRate || 0
                },
                topPerformingPerks: topPerks,
                perksByCategory: perksByCategory,
                perksByStatus: perksByStatus,
                recentPerks: recentPerks,
                expiringPerks: expiringPerks,
                conversions: conversionData,
                trends: await this.getPerkTrends(dateRange)
            };
        } catch (error) {
            throw new AppError('Failed to get perk analytics', 500, 'PERK_ANALYTICS_ERROR');
        }
    }

    // Get comprehensive category analytics
    async getCategoryAnalytics(dateRange = {}) {
        try {
            const [
                categoryTree,
                topCategories,
                categoryPerformance,
                categoryGrowth
            ] = await Promise.all([
                categoryRepository.getCategoryTree(),
                this.getTopCategories(dateRange),
                this.getCategoryPerformance(dateRange),
                this.getCategoryGrowth(dateRange)
            ]);

            const totalCategories = await this.countTotalCategories(categoryTree);

            return {
                overview: {
                    total: totalCategories.total,
                    rootCategories: totalCategories.root,
                    subcategories: totalCategories.subcategories,
                    withPerks: totalCategories.withPerks,
                    avgPerksPerCategory: totalCategories.avgPerksPerCategory
                },
                categoryTree: categoryTree.slice(0, 10), // Limit for performance
                topCategories: topCategories,
                performance: categoryPerformance,
                growth: categoryGrowth,
                distribution: await this.getCategoryDistribution()
            };
        } catch (error) {
            throw new AppError('Failed to get category analytics', 500, 'CATEGORY_ANALYTICS_ERROR');
        }
    }

    // Get comprehensive lead analytics
    async getLeadAnalytics(dateRange = {}) {
        try {
            const [
                leadStats,
                conversionFunnel,
                leadSources,
                leadTrends,
                topPerformers,
                recentLeads,
                followUpStats
            ] = await Promise.all([
                leadRepository.getStats(dateRange),
                leadRepository.getConversionFunnel(dateRange),
                leadRepository.getLeadSources(dateRange),
                this.getLeadTrends(dateRange),
                this.getTopLeadPerformers(dateRange),
                this.getRecentLeads(10),
                this.getFollowUpStats()
            ]);

            return {
                overview: {
                    total: leadStats.total || 0,
                    new: leadStats.new || 0,
                    contacted: leadStats.contacted || 0,
                    qualified: leadStats.qualified || 0,
                    converted: leadStats.converted || 0,
                    lost: leadStats.lost || 0,
                    conversionRate: leadStats.total > 0 ? (leadStats.converted / leadStats.total * 100).toFixed(2) : 0,
                    avgLeadScore: leadStats.avgLeadScore || 0,
                    totalValue: leadStats.totalValue || 0
                },
                conversionFunnel: conversionFunnel,
                sources: leadSources,
                trends: leadTrends,
                topPerformers: topPerformers,
                recentLeads: recentLeads,
                followUpStats: followUpStats,
                qualityMetrics: await this.getLeadQualityMetrics(dateRange)
            };
        } catch (error) {
            throw new AppError('Failed to get lead analytics', 500, 'LEAD_ANALYTICS_ERROR');
        }
    }

    // Get Google Analytics 4 data
    async getGA4Analytics(dateRange = {}) {
        try {
            if (!analyticsService.isConfigured()) {
                return {
                    activeUsers: 0,
                    newUsers: 0,
                    sessions: 0,
                    pageViews: 0,
                    bounceRate: 0,
                    avgSessionDuration: 0,
                    topPages: [],
                    userAcquisition: [],
                    deviceBreakdown: [],
                    locationData: []
                };
            }

            const gaDateRange = {
                startDate: this.formatDateForGA(dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
                endDate: this.formatDateForGA(dateRange.endDate || new Date())
            };

            const [
                basicData,
                topPages,
                deviceData,
                locationData,
                acquisitionData
            ] = await Promise.all([
                analyticsService.getAnalyticsData(gaDateRange),
                this.getTopPages(gaDateRange),
                this.getDeviceBreakdown(gaDateRange),
                this.getLocationData(gaDateRange),
                this.getUserAcquisition(gaDateRange)
            ]);

            return {
                activeUsers: this.extractMetric(basicData, 'activeUsers'),
                newUsers: this.extractMetric(basicData, 'newUsers'),
                sessions: this.extractMetric(basicData, 'sessions'),
                pageViews: this.extractMetric(basicData, 'pageviews'),
                bounceRate: this.extractMetric(basicData, 'bounceRate'),
                avgSessionDuration: this.extractMetric(basicData, 'averageSessionDuration'),
                topPages: topPages,
                userAcquisition: acquisitionData,
                deviceBreakdown: deviceData,
                locationData: locationData,
                trends: this.processAnalyticsTrends(basicData)
            };
        } catch (error) {
            console.warn('GA4 analytics error:', error.message);
            return {
                activeUsers: 0,
                newUsers: 0,
                sessions: 0,
                pageViews: 0,
                bounceRate: 0,
                avgSessionDuration: 0,
                topPages: [],
                userAcquisition: [],
                deviceBreakdown: [],
                locationData: [],
                error: 'GA4 data unavailable'
            };
        }
    }

    // Get recent activity across all modules
    async getRecentActivity(limit = 20) {
        try {
            const [
                recentPerks,
                recentLeads,
                recentCategories
            ] = await Promise.all([
                perkRepository.getRecentPerks(7, 5).catch(() => []),
                leadRepository.getRecentLeads(7, 5).catch(() => []),
                this.getRecentCategoryActivity(7, 5).catch(() => [])
            ]);

            // Force everything to be an array (even if the repo returns null, object, or cursor)
            const perksArr = Array.isArray(recentPerks) ? recentPerks : [recentPerks].filter(Boolean);
            const leadsArr = Array.isArray(recentLeads) ? recentLeads : [recentLeads].filter(Boolean);
            const catsArr = Array.isArray(recentCategories) ? recentCategories : [recentCategories].filter(Boolean);

            const activities = [];

            // Add perk activities
            perksArr.forEach(perk => {
                activities.push({
                    type: 'perk',
                    action: 'created',
                    title: `New perk: ${perk.title}`,
                    description: `Added by ${perk.vendor?.name || 'Unknown'}`,
                    timestamp: perk.createdAt,
                    data: {
                        id: perk._id,
                        status: perk.status,
                        category: perk.categoryId?.name
                    }
                });
            });

            // Add lead activities
            leadsArr.forEach(lead => {
                activities.push({
                    type: 'lead',
                    action: 'submitted',
                    title: `New lead: ${lead.name}`,
                    description: `${lead.email} - Score: ${lead.leadScore}`,
                    timestamp: lead.createdAt,
                    data: {
                        id: lead._id,
                        status: lead.status,
                        source: lead.source,
                        score: lead.leadScore
                    }
                });
            });

            // Add category activities
            catsArr.forEach(category => {
                activities.push({
                    type: 'category',
                    action: 'created',
                    title: `New category: ${category.name}`,
                    description: `Level ${category.level} category`,
                    timestamp: category.createdAt,
                    data: {
                        id: category._id,
                        level: category.level,
                        perkCount: category.perkCount
                    }
                });
            });

            // Sort and limit
            return activities
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

        } catch (error) {
            console.error('Recent Activity Error:', error);
            throw new AppError(
                `Failed to get recent activity: ${error.message}`,
                500,
                'RECENT_ACTIVITY_ERROR'
            );
        }
    }


    // Get performance metrics summary
    async getPerformanceMetrics(dateRange = {}) {
        try {
            const [
                perkMetrics,
                leadMetrics,
                gaMetrics
            ] = await Promise.all([
                this.getPerkPerformanceMetrics(dateRange),
                this.getLeadPerformanceMetrics(dateRange),
                this.getGA4PerformanceMetrics(dateRange)
            ]);

            return {
                perks: perkMetrics,
                leads: leadMetrics,
                traffic: gaMetrics,
                overall: this.calculateOverallPerformance(perkMetrics, leadMetrics, gaMetrics)
            };
        } catch (error) {
            throw new AppError('Failed to get performance metrics', 500, 'PERFORMANCE_METRICS_ERROR');
        }
    }

    // Helper methods for specific analytics

    async getTopPerformingPerks(dateRange = {}, limit = 10) {
        try {
            // This would typically use GA4 data or your own analytics
            const perks = await perkRepository.findAll({
                status: 'active',
                sortBy: 'views_desc'
            }, 1, limit);

            return perks.data.map(perk => ({
                id: perk._id,
                title: perk.title,
                vendor: perk.vendor?.name,
                views: perk.metrics?.viewCount || 0,
                clicks: perk.metrics?.clickCount || 0,
                conversions: perk.metrics?.redemptionCount || 0,
                conversionRate: perk.metrics?.conversionRate || 0,
                category: perk.categoryId?.name
            }));
        } catch (error) {
            console.error('Error getting top performing perks:', error);
            return [];
        }
    }

    async getPerksByCategory(dateRange = {}) {
        try {
            const categories = await categoryRepository.findAll({ status: 'active' }, 1, 50);

            return categories.data.map(category => ({
                categoryId: category._id,
                categoryName: category.name,
                perkCount: category.perkCount || 0,
                totalPerkCount: category.totalPerkCount || 0,
                level: category.level
            })).sort((a, b) => b.perkCount - a.perkCount);
        } catch (error) {
            console.error('Error getting perks by category:', error);
            return [];
        }
    }

    async getPerksByStatus() {
        try {
            const stats = await perkRepository.getStats();

            return [
                { status: 'active', count: stats.active || 0, color: '#10B981' },
                { status: 'pending', count: stats.pending || 0, color: '#F59E0B' },
                { status: 'rejected', count: stats.rejected || 0, color: '#EF4444' },
                { status: 'inactive', count: (stats.total || 0) - (stats.active || 0) - (stats.pending || 0) - (stats.rejected || 0), color: '#6B7280' }
            ];
        } catch (error) {
            console.error('Error getting perks by status:', error);
            return [];
        }
    }

    async getRecentPerks(days = 7) {
        try {
            return await perkRepository.getRecentPerks(days, 10);
        } catch (error) {
            console.error('Error getting recent perks:', error);
            return [];
        }
    }

    async getExpiringPerks(days = 30) {
        try {
            return await perkRepository.getExpiringSoon(days);
        } catch (error) {
            console.error('Error getting expiring perks:', error);
            return [];
        }
    }

    async getPerkConversions(dateRange = {}) {
        try {
            const perks = await perkRepository.findAll({
                status: 'active',
                sortBy: 'clicks_desc'
            }, 1, 20);

            return perks.data.map(perk => ({
                perkId: perk._id,
                title: perk.title,
                vendor: perk.vendor?.name,
                clicks: perk.metrics?.clickCount || 0,
                conversions: perk.metrics?.redemptionCount || 0,
                conversionRate: perk.metrics?.conversionRate || 0
            })).filter(perk => perk.clicks > 0);
        } catch (error) {
            console.error('Error getting perk conversions:', error);
            return [];
        }
    }

    async getPerkTrends(dateRange = {}) {
        try {
            // This would typically aggregate data over time periods
            // For now, returning mock trend data
            const days = Math.ceil((new Date(dateRange.endDate || Date.now()) - new Date(dateRange.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24));
            const trends = [];

            for (let i = days; i >= 0; i--) {
                const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                trends.push({
                    date: date.toISOString().split('T')[0],
                    views: Math.floor(Math.random() * 1000) + 100,
                    clicks: Math.floor(Math.random() * 200) + 20,
                    conversions: Math.floor(Math.random() * 50) + 5
                });
            }

            return trends;
        } catch (error) {
            console.error('Error getting perk trends:', error);
            return [];
        }
    }

    async getTopCategories(dateRange = {}, limit = 10) {
        try {
            const categories = await categoryRepository.findAll({
                status: 'active',
                isVisible: true
            }, 1, limit);

            return categories.data
                .sort((a, b) => (b.totalPerkCount || 0) - (a.totalPerkCount || 0))
                .map(category => ({
                    id: category._id,
                    name: category.name,
                    level: category.level,
                    perkCount: category.perkCount || 0,
                    totalPerkCount: category.totalPerkCount || 0,
                    image: category.image?.thumbnailUrl
                }));
        } catch (error) {
            console.error('Error getting top categories:', error);
            return [];
        }
    }

    async getCategoryPerformance(dateRange = {}) {
        try {
            const categories = await categoryRepository.findAll({ status: 'active' }, 1, 20);

            return categories.data.map(category => ({
                categoryId: category._id,
                categoryName: category.name,
                perkCount: category.perkCount || 0,
                viewCount: category.viewCount || 0,
                level: category.level,
                performance: this.calculateCategoryPerformance(category)
            })).sort((a, b) => b.performance - a.performance);
        } catch (error) {
            console.error('Error getting category performance:', error);
            return [];
        }
    }

    async getCategoryGrowth(dateRange = {}) {
        try {
            // Mock growth data - in production, you'd track this over time
            const categories = await categoryRepository.findAll({ status: 'active' }, 1, 10);

            return categories.data.map(category => ({
                categoryId: category._id,
                categoryName: category.name,
                currentPerkCount: category.perkCount || 0,
                previousPerkCount: Math.max(0, (category.perkCount || 0) - Math.floor(Math.random() * 5)),
                growthRate: Math.floor(Math.random() * 20) - 5 // -5 to +15% growth
            }));
        } catch (error) {
            console.error('Error getting category growth:', error);
            return [];
        }
    }

    async getCategoryDistribution() {
        try {
            const allCategories = await categoryRepository.findAll({}, 1, 1000);

            const distribution = {
                byLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
                byStatus: { active: 0, inactive: 0 },
                byPerkCount: {
                    empty: 0,      // 0 perks
                    small: 0,      // 1-5 perks
                    medium: 0,     // 6-20 perks
                    large: 0       // 20+ perks
                }
            };

            allCategories.data.forEach(category => {
                // By level
                distribution.byLevel[category.level] = (distribution.byLevel[category.level] || 0) + 1;

                // By status
                distribution.byStatus[category.status === 'active' ? 'active' : 'inactive']++;

                // By perk count
                const perkCount = category.perkCount || 0;
                if (perkCount === 0) distribution.byPerkCount.empty++;
                else if (perkCount <= 5) distribution.byPerkCount.small++;
                else if (perkCount <= 20) distribution.byPerkCount.medium++;
                else distribution.byPerkCount.large++;
            });

            return distribution;
        } catch (error) {
            console.error('Error getting category distribution:', error);
            return { byLevel: {}, byStatus: {}, byPerkCount: {} };
        }
    }

    async countTotalCategories(categoryTree) {
        try {
            const allCategories = await categoryRepository.findAll({}, 1, 1000);
            const total = allCategories.data.length;
            const root = allCategories.data.filter(cat => cat.level === 0).length;
            const subcategories = total - root;
            const withPerks = allCategories.data.filter(cat => (cat.perkCount || 0) > 0).length;
            const totalPerks = allCategories.data.reduce((sum, cat) => sum + (cat.perkCount || 0), 0);
            const avgPerksPerCategory = total > 0 ? (totalPerks / total).toFixed(2) : 0;

            return { total, root, subcategories, withPerks, avgPerksPerCategory };
        } catch (error) {
            console.error('Error counting categories:', error);
            return { total: 0, root: 0, subcategories: 0, withPerks: 0, avgPerksPerCategory: 0 };
        }
    }

    async getLeadTrends(dateRange = {}) {
        try {
            // Mock trend data - in production, you'd aggregate by date
            const days = Math.ceil((new Date(dateRange.endDate || Date.now()) - new Date(dateRange.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)) / (1000 * 60 * 60 * 24));
            const trends = [];

            for (let i = days; i >= 0; i--) {
                const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                trends.push({
                    date: date.toISOString().split('T')[0],
                    newLeads: Math.floor(Math.random() * 20) + 5,
                    conversions: Math.floor(Math.random() * 5) + 1,
                    avgScore: Math.floor(Math.random() * 40) + 60
                });
            }

            return trends;
        } catch (error) {
            console.error('Error getting lead trends:', error);
            return [];
        }
    }

    async getTopLeadPerformers(dateRange = {}) {
        try {
            // Get leads with highest scores and conversion rates
            const leads = await leadRepository.getHighValueLeads(70, 1, 10);

            return leads.data.map(lead => ({
                id: lead._id,
                name: lead.name,
                email: lead.email,
                score: lead.leadScore || 0,
                status: lead.status,
                source: lead.source,
                perkInterest: lead.perkId?.title || 'N/A',
                createdAt: lead.createdAt
            }));
        } catch (error) {
            console.error('Error getting top lead performers:', error);
            return [];
        }
    }

    async getRecentLeads(limit = 10) {
        try {
            return await leadRepository.getRecentLeads(7, limit);
        } catch (error) {
            console.error('Error getting recent leads:', error);
            return [];
        }
    }

    async getFollowUpStats() {
        try {
            const needsFollowUp = await leadRepository.getLeadsNeedingFollowUp(1, 100);
            const total = needsFollowUp.pagination?.totalItems || 0;

            return {
                totalNeedingFollowUp: total,
                overdue: Math.floor(total * 0.3), // Mock calculation
                todaysDue: Math.floor(total * 0.2),
                thisWeekDue: Math.floor(total * 0.5)
            };
        } catch (error) {
            console.error('Error getting follow-up stats:', error);
            return { totalNeedingFollowUp: 0, overdue: 0, todaysDue: 0, thisWeekDue: 0 };
        }
    }

    async getLeadQualityMetrics(dateRange = {}) {
        try {
            const stats = await leadRepository.getStats(dateRange);

            return {
                averageScore: stats.avgLeadScore || 0,
                highQualityLeads: stats.highQuality || 0, // Score > 80
                mediumQualityLeads: stats.mediumQuality || 0, // Score 50-80
                lowQualityLeads: stats.lowQuality || 0, // Score < 50
                qualityDistribution: {
                    excellent: Math.floor((stats.highQuality || 0) / (stats.total || 1) * 100),
                    good: Math.floor((stats.mediumQuality || 0) / (stats.total || 1) * 100),
                    poor: Math.floor((stats.lowQuality || 0) / (stats.total || 1) * 100)
                }
            };
        } catch (error) {
            console.error('Error getting lead quality metrics:', error);
            return { averageScore: 0, highQualityLeads: 0, mediumQualityLeads: 0, lowQualityLeads: 0, qualityDistribution: {} };
        }
    }

    async getRecentCategoryActivity(days = 7, limit = 5) {
        try {
            const categories = await categoryRepository.findAll({
                sortBy: 'created_desc'
            }, 1, limit);

            return categories.data.filter(category => {
                const daysDiff = (Date.now() - new Date(category.createdAt)) / (1000 * 60 * 60 * 24);
                return daysDiff <= days;
            });
        } catch (error) {
            console.error('Error getting recent category activity:', error);
            return [];
        }
    }

    // GA4 Helper Methods
    //   formatDateForGA(date) {
    //     if (!date) return 'today';
    //     if (typeof date === 'string') return date;

    //     const now = new Date();
    //     const diffTime = Math.abs(now - date);
    //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    //     if (diffDays === 0) return 'today';
    //     if (diffDays === 1) return 'yesterday';
    //     if (diffDays <= 7) return `${diffDays}daysAgo`;
    //     if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}weeksAgo`;

    //     return date.toISOString().split('T')[0];
    //   }

    extractMetric(data, metricName) {
        if (!data || !data.data || data.data.length === 0) return 0;

        return data.data.reduce((sum, row) => {
            return sum + (row.metrics?.[metricName] || 0);
        }, 0);
    }

    processAnalyticsTrends(data) {
        if (!data || !data.data) return [];

        return data.data.map(row => ({
            date: row.dimensions?.date || '',
            activeUsers: row.metrics?.activeUsers || 0,
            sessions: row.metrics?.sessions || 0,
            pageviews: row.metrics?.pageviews || 0
        }));
    }

    async getTopPages(dateRange) {
        try {
            if (!analyticsService.dataClient) return [];

            const [response] = await analyticsService.dataClient.runReport({
                property: `properties/${analyticsService.propertyId}`,
                dateRanges: [dateRange],
                metrics: [{ name: 'pageviews' }, { name: 'sessions' }],
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                orderBys: [{ metric: { metricName: 'pageviews' }, desc: true }],
                limit: 10
            });

            return analyticsService.formatAnalyticsResponse(response).data.map(row => ({
                path: row.dimensions.pagePath,
                title: row.dimensions.pageTitle,
                pageviews: row.metrics.pageviews,
                sessions: row.metrics.sessions
            }));
        } catch (error) {
            console.error('Error getting top pages:', error);
            return [];
        }
    }

    async getDeviceBreakdown(dateRange) {
        try {
            if (!analyticsService.dataClient) return [];

            const [response] = await analyticsService.dataClient.runReport({
                property: `properties/${analyticsService.propertyId}`,
                dateRanges: [dateRange],
                metrics: [{ name: 'sessions' }],
                dimensions: [{ name: 'deviceCategory' }]
            });

            return analyticsService.formatAnalyticsResponse(response).data.map(row => ({
                device: row.dimensions.deviceCategory,
                sessions: row.metrics.sessions
            }));
        } catch (error) {
            console.error('Error getting device breakdown:', error);
            return [];
        }
    }

    async getLocationData(dateRange) {
        try {
            if (!analyticsService.dataClient) return [];

            const [response] = await analyticsService.dataClient.runReport({
                property: `properties/${analyticsService.propertyId}`,
                dateRanges: [dateRange],
                metrics: [{ name: 'sessions' }],
                dimensions: [{ name: 'country' }, { name: 'city' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: 20
            });

            return analyticsService.formatAnalyticsResponse(response).data.map(row => ({
                country: row.dimensions.country,
                city: row.dimensions.city,
                sessions: row.metrics.sessions
            }));
        } catch (error) {
            console.error('Error getting location data:', error);
            return [];
        }
    }

    async getUserAcquisition(dateRange) {
        try {
            if (!analyticsService.dataClient) return [];

            const [response] = await analyticsService.dataClient.runReport({
                property: `properties/${analyticsService.propertyId}`,
                dateRanges: [dateRange],
                metrics: [{ name: 'newUsers' }],
                dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
                orderBys: [{ metric: { metricName: 'newUsers' }, desc: true }],
                limit: 10
            });

            return analyticsService.formatAnalyticsResponse(response).data.map(row => ({
                source: row.dimensions.sessionSource,
                medium: row.dimensions.sessionMedium,
                newUsers: row.metrics.newUsers
            }));
        } catch (error) {
            console.error('Error getting user acquisition:', error);
            return [];
        }
    }

    // Performance calculation helpers
    calculateCategoryPerformance(category) {
        const perkCount = category.perkCount || 0;
        const viewCount = category.viewCount || 0;
        const level = category.level || 0;

        // Simple performance score based on perks and engagement
        return (perkCount * 10) + (viewCount * 0.1) + (level === 0 ? 20 : 0);
    }

    async getPerkPerformanceMetrics(dateRange) {
        try {
            const stats = await perkRepository.getStats(dateRange);

            return {
                totalViews: stats.totalViews || 0,
                totalClicks: stats.totalClicks || 0,
                totalRedemptions: stats.totalRedemptions || 0,
                averageConversionRate: stats.avgConversionRate || 0,
                clickThroughRate: stats.totalViews > 0 ? ((stats.totalClicks / stats.totalViews) * 100).toFixed(2) : 0,
                redemptionRate: stats.totalClicks > 0 ? ((stats.totalRedemptions / stats.totalClicks) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error getting perk performance metrics:', error);
            return { totalViews: 0, totalClicks: 0, totalRedemptions: 0, averageConversionRate: 0, clickThroughRate: 0, redemptionRate: 0 };
        }
    }

    async getLeadPerformanceMetrics(dateRange) {
        try {
            const stats = await leadRepository.getStats(dateRange);

            return {
                totalLeads: stats.total || 0,
                conversionRate: stats.total > 0 ? ((stats.converted || 0) / stats.total * 100).toFixed(2) : 0,
                averageScore: stats.avgLeadScore || 0,
                totalValue: stats.totalValue || 0,
                averageValue: stats.converted > 0 ? ((stats.totalValue || 0) / stats.converted).toFixed(2) : 0,
                responseRate: stats.total > 0 ? (((stats.contacted || 0) / stats.total) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error getting lead performance metrics:', error);
            return { totalLeads: 0, conversionRate: 0, averageScore: 0, totalValue: 0, averageValue: 0, responseRate: 0 };
        }
    }

    async getGA4PerformanceMetrics(dateRange) {
        try {
            const gaData = await this.getGA4Analytics(dateRange);

            return {
                activeUsers: gaData.activeUsers || 0,
                sessionsPerUser: gaData.activeUsers > 0 ? ((gaData.sessions || 0) / gaData.activeUsers).toFixed(2) : 0,
                pageviewsPerSession: gaData.sessions > 0 ? ((gaData.pageViews || 0) / gaData.sessions).toFixed(2) : 0,
                bounceRate: gaData.bounceRate || 0,
                avgSessionDuration: gaData.avgSessionDuration || 0
            };
        } catch (error) {
            console.error('Error getting GA4 performance metrics:', error);
            return { activeUsers: 0, sessionsPerUser: 0, pageviewsPerSession: 0, bounceRate: 0, avgSessionDuration: 0 };
        }
    }

    calculateOverallPerformance(perkMetrics, leadMetrics, trafficMetrics) {
        // Calculate a composite performance score
        const perkScore = (parseFloat(perkMetrics.clickThroughRate) + parseFloat(perkMetrics.redemptionRate)) / 2;
        const leadScore = parseFloat(leadMetrics.conversionRate);
        const trafficScore = (100 - parseFloat(trafficMetrics.bounceRate)) * parseFloat(trafficMetrics.pageviewsPerSession);

        return {
            perkPerformance: perkScore.toFixed(2),
            leadPerformance: leadScore.toFixed(2),
            trafficPerformance: (trafficScore / 10).toFixed(2), // Scale down traffic score
            overallScore: ((perkScore + leadScore + (trafficScore / 10)) / 3).toFixed(2)
        };
    }

    // Blog analytics
    async getBlogAnalytics(dateRange = {}) {
        try {
            const [
                blogStats,
            ] = await Promise.all([
                blogRepository.getStats(dateRange),
            ]);
            return {
                blogStats
            };
        } catch (error) {
            console.error('Error getting blog analytics:', error);
            throw error;
        }
    }
}

module.exports = new DashboardService();