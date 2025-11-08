const SeoSetting = require('../models/SeoSetting');
const uploadService = require('./uploadService');
const perkRepository = require('../repositories/perkRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { AppError } = require('../middleware/errorHandler');
const fs = require('fs').promises;
const path = require('path');

class SeoService {
    // Get active SEO settings
    async getActiveSettings() {
        try {
            const settings = await SeoSetting.getActiveSettings();
            if (!settings) {
                throw new AppError('No active SEO settings found', 404, 'SEO_SETTINGS_NOT_FOUND');
            }
            return settings;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to get SEO settings', 500, 'GET_SEO_SETTINGS_ERROR');
        }
    }

    // Create or update SEO settings
    async updateSeoSettings(settingsData, userId, imageFiles = {}) {
        try {
            // Handle image uploads
            if (imageFiles.defaultOgImage) {
                const ogImageData = await this.processImageUpload(imageFiles.defaultOgImage);
                settingsData.defaultOgImage = ogImageData;
            }

            if (imageFiles.organizationLogo) {
                const logoData = await this.processImageUpload(imageFiles.organizationLogo);
                settingsData.organization = {
                    ...settingsData.organization,
                    logo: logoData
                };
            }

            // Deactivate existing settings
            await SeoSetting.updateMany({ isActive: true }, { isActive: false });

            // Create new active settings
            const newSettings = new SeoSetting({
                ...settingsData,
                isActive: true,
                createdBy: userId,
                updatedBy: userId
            });

            const savedSettings = await newSettings.save();

            // Generate sitemap and robots.txt
            if (savedSettings.sitemapSettings.enabled) {
                await this.generateSitemap(savedSettings);
            }

            if (savedSettings.robotsSettings.enabled) {
                await this.generateRobotsTxt(savedSettings);
            }

            return savedSettings;
        } catch (error) {
            if (error instanceof AppError) throw error;
            //log error
            throw new AppError('Failed to update SEO settings', 500, 'UPDATE_SEO_SETTINGS_ERROR');
        }
    }

    // Process image upload for SEO images
    async processImageUpload(imageFile) {
        try {
            const validation = uploadService.validateFile(imageFile, 5242880, ['image/jpeg', 'image/png', 'image/webp']);
            if (!validation.valid) {
                throw new AppError(`Image validation failed: ${validation.errors.join(', ')}`, 400, 'INVALID_IMAGE');
            }

            const uploadResult = await uploadService.processSingleUpload(imageFile, 'seo', 'high');

            if (!uploadResult.success) {
                throw new AppError('Failed to upload image', 500, 'UPLOAD_FAILED');
            }

            const { url, publicId, width, height } = uploadResult.data;

            return { url, publicId, width, height };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to process image upload', 500, 'IMAGE_PROCESSING_ERROR');
        }
    }

    // Generate meta tags for a page
    generateMetaTags(pageData = {}, seoSettings) {
        const {
            title,
            description,
            keywords = [],
            ogTitle,
            ogDescription,
            ogImage,
            ogType = 'website',
            canonical,
            noindex = false,
            nofollow = false
        } = pageData;

        const metaTags = [];

        // Basic meta tags
        metaTags.push({
            name: 'title',
            content: title || seoSettings.defaultMetaTitle
        });

        metaTags.push({
            name: 'description',
            content: description || seoSettings.defaultMetaDescription
        });

        if (keywords.length > 0 || seoSettings.defaultMetaKeywords.length > 0) {
            metaTags.push({
                name: 'keywords',
                content: [...keywords, ...seoSettings.defaultMetaKeywords].join(', ')
            });
        }

        // Robots meta
        const robotsContent = [];
        if (noindex) robotsContent.push('noindex');
        if (nofollow) robotsContent.push('nofollow');
        if (robotsContent.length === 0) robotsContent.push('index', 'follow');

        metaTags.push({
            name: 'robots',
            content: robotsContent.join(', ')
        });

        // Canonical URL
        if (canonical) {
            metaTags.push({
                rel: 'canonical',
                href: canonical
            });
        }

        // Open Graph tags
        metaTags.push({
            property: 'og:title',
            content: ogTitle || title || seoSettings.defaultOgTitle || seoSettings.defaultMetaTitle
        });

        metaTags.push({
            property: 'og:description',
            content: ogDescription || description || seoSettings.defaultOgDescription || seoSettings.defaultMetaDescription
        });

        metaTags.push({
            property: 'og:type',
            content: ogType
        });

        metaTags.push({
            property: 'og:site_name',
            content: seoSettings.siteName
        });

        if (ogImage || seoSettings.defaultOgImage?.url) {
            metaTags.push({
                property: 'og:image',
                content: ogImage || seoSettings.defaultOgImage.url
            });

            if (seoSettings.defaultOgImage?.width && seoSettings.defaultOgImage?.height) {
                metaTags.push({
                    property: 'og:image:width',
                    content: seoSettings.defaultOgImage.width.toString()
                });

                metaTags.push({
                    property: 'og:image:height',
                    content: seoSettings.defaultOgImage.height.toString()
                });
            }
        }

        // Twitter Card tags
        metaTags.push({
            name: 'twitter:card',
            content: seoSettings.twitterCardType
        });

        if (seoSettings.twitterSite) {
            metaTags.push({
                name: 'twitter:site',
                content: seoSettings.twitterSite
            });
        }

        if (seoSettings.twitterCreator) {
            metaTags.push({
                name: 'twitter:creator',
                content: seoSettings.twitterCreator
            });
        }

        // Custom meta tags
        if (seoSettings.additionalSettings?.customMetaTags) {
            seoSettings.additionalSettings.customMetaTags.forEach(tag => {
                metaTags.push(tag);
            });
        }

        return metaTags;
    }

    // Generate JSON-LD schema markup
    generateSchemaMarkup(pageData = {}, seoSettings) {
        const schemas = [];

        // Organization schema
        if (seoSettings.schemaSettings.enableOrganization) {
            const orgSchema = seoSettings.getOrganizationSchema();
            if (orgSchema) schemas.push(orgSchema);
        }

        // Website schema
        if (seoSettings.schemaSettings.enableWebsite) {
            const websiteSchema = seoSettings.getWebsiteSchema();
            if (websiteSchema) schemas.push(websiteSchema);
        }

        // Breadcrumbs schema
        if (seoSettings.schemaSettings.enableBreadcrumbs && pageData.breadcrumbs) {
            schemas.push(this.generateBreadcrumbSchema(pageData.breadcrumbs, seoSettings.siteUrl));
        }

        // Product schema for perks
        if (seoSettings.schemaSettings.enableProducts && pageData.type === 'perk' && pageData.perk) {
            schemas.push(this.generateProductSchema(pageData.perk, seoSettings));
        }

        return schemas;
    }

    // Generate breadcrumb schema
    generateBreadcrumbSchema(breadcrumbs, siteUrl) {
        return {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                item: `${siteUrl}${item.url}`
            }))
        };
    }

    // Generate product schema for perks
    generateProductSchema(perk, seoSettings) {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: perk.title,
            description: perk.description,
            image: perk.images?.main?.url,
            brand: {
                '@type': 'Brand',
                name: perk.vendor?.name
            },
            category: perk.categoryId?.name
        };

        if (seoSettings.schemaSettings.enableOffers && perk.originalPrice?.amount) {
            schema.offers = {
                '@type': 'Offer',
                priceCurrency: perk.originalPrice.currency || 'USD',
                price: perk.discountedPrice?.amount || perk.originalPrice.amount,
                priceValidUntil: perk.availability?.endDate,
                availability: perk.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                seller: {
                    '@type': 'Organization',
                    name: perk.vendor?.name
                }
            };

            if (perk.originalPrice.amount !== perk.discountedPrice?.amount) {
                schema.offers.priceSpecification = {
                    '@type': 'UnitPriceSpecification',
                    price: perk.originalPrice.amount,
                    priceCurrency: perk.originalPrice.currency
                };
            }
        }

        return schema;
    }

    // Generate sitemap.xml
    async generateSitemap(seoSettings) {
        try {
            const urls = [];
            const siteUrl = seoSettings.siteUrl;
            const changeFreq = seoSettings.sitemapSettings.changeFreq;
            const priority = seoSettings.sitemapSettings.priority;

            // Homepage
            urls.push({
                loc: siteUrl,
                lastmod: new Date().toISOString(),
                changefreq: 'daily',
                priority: '1.0'
            });

            // Static pages
            const staticPages = [
                { url: '/about', priority: '0.8' },
                { url: '/contact', priority: '0.8' },
                { url: '/privacy', priority: '0.5' },
                { url: '/terms', priority: '0.5' }
            ];

            staticPages.forEach(page => {
                urls.push({
                    loc: `${siteUrl}${page.url}`,
                    lastmod: new Date().toISOString(),
                    changefreq: changeFreq,
                    priority: page.priority
                });
            });

            // Categories
            if (seoSettings.sitemapSettings.includeCategories) {
                const categories = await categoryRepository.findAll({ status: 'active', isVisible: true }, 1, 1000);
                categories.data.forEach(category => {
                    urls.push({
                        loc: `${siteUrl}/categories/${category.slug}`,
                        lastmod: category.updatedAt.toISOString(),
                        changefreq: changeFreq,
                        priority: category.level === 0 ? '0.9' : '0.8'
                    });
                });
            }

            // Perks
            if (seoSettings.sitemapSettings.includePerks) {
                const perks = await perkRepository.findAll({ status: 'active', isVisible: true }, 1, 1000);
                perks.data.forEach(perk => {
                    urls.push({
                        loc: `${siteUrl}/perks/${perk.slug}`,
                        lastmod: perk.updatedAt.toISOString(),
                        changefreq: changeFreq,
                        priority: perk.isFeatured ? '0.9' : '0.7'
                    });
                });
            }

            // Generate XML
            const sitemapXml = this.generateSitemapXml(urls);

            // Save to public directory
            const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
            await fs.writeFile(sitemapPath, sitemapXml, 'utf8');

            // Update last generated timestamp
            await SeoSetting.findByIdAndUpdate(seoSettings._id, {
                'sitemapSettings.lastGenerated': new Date()
            });

            console.log('Sitemap generated successfully');
            return sitemapXml;
        } catch (error) {
            console.error('Sitemap generation error:', error);
            throw new AppError('Failed to generate sitemap', 500, 'SITEMAP_GENERATION_ERROR');
        }
    }

    // Generate XML content for sitemap
    generateSitemapXml(urls) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        urls.forEach(url => {
            xml += '  <url>\n';
            xml += `    <loc>${url.loc}</loc>\n`;
            xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
            xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
            xml += `    <priority>${url.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';
        return xml;
    }

    // Generate robots.txt
    async generateRobotsTxt(seoSettings) {
        try {
            let robotsContent = '';

            if (seoSettings.robotsSettings.allowAll) {
                robotsContent += 'User-agent: *\n';
                robotsContent += 'Disallow:\n\n';
            }

            // Custom rules
            if (seoSettings.robotsSettings.customRules && seoSettings.robotsSettings.customRules.length > 0) {
                seoSettings.robotsSettings.customRules.forEach(rule => {
                    robotsContent += `User-agent: ${rule.userAgent}\n`;

                    if (rule.allow && rule.allow.length > 0) {
                        rule.allow.forEach(path => {
                            robotsContent += `Allow: ${path}\n`;
                        });
                    }

                    if (rule.disallow && rule.disallow.length > 0) {
                        rule.disallow.forEach(path => {
                            robotsContent += `Disallow: ${path}\n`;
                        });
                    }

                    robotsContent += '\n';
                });
            }

            // Crawl delay
            if (seoSettings.robotsSettings.crawlDelay) {
                robotsContent += `Crawl-delay: ${seoSettings.robotsSettings.crawlDelay}\n\n`;
            }

            // Sitemap URLs
            if (seoSettings.sitemapSettings.enabled) {
                robotsContent += `Sitemap: ${seoSettings.siteUrl}/sitemap.xml\n`;
            }

            if (seoSettings.robotsSettings.sitemapUrls && seoSettings.robotsSettings.sitemapUrls.length > 0) {
                seoSettings.robotsSettings.sitemapUrls.forEach(url => {
                    robotsContent += `Sitemap: ${url}\n`;
                });
            }

            // Save to public directory
            const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
            await fs.writeFile(robotsPath, robotsContent, 'utf8');

            console.log('Robots.txt generated successfully');
            return robotsContent;
        } catch (error) {
            console.error('Robots.txt generation error:', error);
            throw new AppError('Failed to generate robots.txt', 500, 'ROBOTS_GENERATION_ERROR');
        }
    }

    // Get page SEO data
    async getPageSeoData(pageType, pageIdentifier, additionalData = {}) {
        try {
            const seoSettings = await this.getActiveSettings();
            let pageData = { type: pageType };

            switch (pageType) {
                case 'home':
                    pageData = {
                        ...pageData,
                        title: seoSettings.defaultMetaTitle,
                        description: seoSettings.defaultMetaDescription,
                        canonical: seoSettings.siteUrl
                    };
                    break;

                case 'perk':
                    const perk = await perkRepository.findBySlug(pageIdentifier, true);
                    if (perk) {
                        pageData = {
                            ...pageData,
                            perk,
                            title: perk.seo?.title || `${perk.title} - ${seoSettings.siteName}`,
                            description: perk.seo?.description || perk.shortDescription || perk.description.substring(0, 160),
                            keywords: perk.seo?.keywords || perk.tags || [],
                            ogTitle: perk.seo?.ogTitle,
                            ogDescription: perk.seo?.ogDescription,
                            ogImage: perk.images?.main?.url,
                            ogType: 'product',
                            canonical: `${seoSettings.siteUrl}/perks/${perk.slug}`,
                            breadcrumbs: [
                                { name: 'Home', url: '/' },
                                { name: perk.categoryId?.name || 'Category', url: `/categories/${perk.categoryId?.slug}` },
                                { name: perk.title, url: `/perks/${perk.slug}` }
                            ]
                        };
                    }
                    break;

                case 'category':
                    const category = await categoryRepository.findBySlug(pageIdentifier, true);
                    if (category) {
                        pageData = {
                            ...pageData,
                            category,
                            title: category.seoTitle || `${category.name} - ${seoSettings.siteName}`,
                            description: category.seoDescription || category.description?.substring(0, 160),
                            canonical: `${siteUrl}/categories/${category.slug}`,
                            breadcrumbs: await this.getCategoryBreadcrumbs(category, seoSettings.siteUrl)
                        };
                    }
                    break;

                default:
                    pageData = {
                        ...pageData,
                        ...additionalData,
                        title: additionalData.title ? `${additionalData.title} - ${seoSettings.siteName}` : seoSettings.defaultMetaTitle,
                        description: additionalData.description || seoSettings.defaultMetaDescription
                    };
            }

            const metaTags = this.generateMetaTags(pageData, seoSettings);
            const schemaMarkup = this.generateSchemaMarkup(pageData, seoSettings);

            return {
                pageData,
                metaTags,
                schemaMarkup,
                seoSettings
            };
        } catch (error) {
            console.error('Get page SEO data error:', error);
            throw new AppError('Failed to get page SEO data', 500, 'GET_PAGE_SEO_ERROR');
        }
    }

    // Get category breadcrumbs
    async getCategoryBreadcrumbs(category, siteUrl) {
        try {
            const breadcrumbs = [{ name: 'Home', url: '/' }];

            if (category.parentId) {
                const hierarchy = await category.getFullHierarchy();
                hierarchy.slice(0, -1).forEach(cat => {
                    breadcrumbs.push({
                        name: cat.name,
                        url: `/categories/${cat.slug}`
                    });
                });
            }

            breadcrumbs.push({
                name: category.name,
                url: `/categories/${category.slug}`
            });

            return breadcrumbs;
        } catch (error) {
            return [
                { name: 'Home', url: '/' },
                { name: category.name, url: `/categories/${category.slug}` }
            ];
        }
    }

    // Regenerate sitemap manually
    async regenerateSitemap() {
        try {
            const seoSettings = await this.getActiveSettings();
            if (seoSettings.sitemapSettings.enabled) {
                return await this.generateSitemap(seoSettings);
            }
            throw new AppError('Sitemap generation is disabled', 400, 'SITEMAP_DISABLED');
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to regenerate sitemap', 500, 'REGENERATE_SITEMAP_ERROR');
        }
    }

    // Regenerate robots.txt manually
    async regenerateRobotsTxt() {
        try {
            const seoSettings = await this.getActiveSettings();
            if (seoSettings.robotsSettings.enabled) {
                return await this.generateRobotsTxt(seoSettings);
            }
            throw new AppError('Robots.txt generation is disabled', 400, 'ROBOTS_DISABLED');
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to regenerate robots.txt', 500, 'REGENERATE_ROBOTS_ERROR');
        }
    }
}

module.exports = new SeoService();