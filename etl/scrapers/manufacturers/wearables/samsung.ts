import { BaseScraper } from '../../scraper-base';
import { SIPData } from '../../../types';
import { slugify } from '../../../utils';

/**
 * Samsung Galaxy Watch Scraper
 * Real-time scraping of Samsung wearable product pages
 * Returns null if scraping fails - no fallback data
 */
export class SamsungWatchScraper extends BaseScraper {
  constructor() {
    super('https://www.samsung.com', 'Samsung');
  }

  async getProductListings(): Promise<string[]> {
    try {
      // Fetch Samsung wearables page with browser for dynamic content
      const $ = await this.fetchHTMLWithBrowser('https://www.samsung.com/us/mobile/wearables/all-wearables/');

      if (!$) {
        console.warn('Failed to fetch Samsung watches main page');
        return [];
      }

      const productUrls = new Set<string>();

      // Method 1: Find direct product links
      $('a[href*="/watches/galaxy-watch"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/buy') && !href.includes('/compare') && !href.includes('?')) {
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.samsung.com${url}`;
          }
          url = url.split('?')[0].split('#')[0];
          if (!url.endsWith('/')) {
            url += '/';
          }
          productUrls.add(url);
        }
      });

      // Method 2: Look for product cards and navigation
      $('[class*="product"] a, [data-linktype="product"] a, [class*="card"] a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('galaxy-watch') && !href.includes('/buy')) {
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.samsung.com${url}`;
          }
          url = url.split('?')[0].split('#')[0];
          if (!url.endsWith('/')) {
            url += '/';
          }
          productUrls.add(url);
        }
      });

      // Filter to only actual product pages
      const validUrls = Array.from(productUrls).filter(url => {
        return url.match(/galaxy-watch[^/]*\/$/i) && !url.includes('/accessories');
      });

      if (validUrls.length > 0) {
        console.log(`Discovered ${validUrls.length} Samsung Galaxy Watch product URLs`);
        return validUrls;
      }

      console.warn('No products discovered');
      return [];

    } catch (error) {
      console.error('Error discovering Samsung watches:', error);
      return [];
    }
  }

  async scrapeProduct(url: string): Promise<SIPData | null> {
    try {
      // Try to fetch with Playwright first
      let $ = await this.fetchHTMLWithBrowser(url);

      // Fallback to regular fetch
      if (!$) {
        console.warn(`Browser fetch failed for ${url}, trying regular fetch...`);
        $ = await this.fetchHTML(url);
      }

      if (!$) {
        console.warn(`All fetch methods failed for ${url}`);
        return null;
      }

      // Extract product data
      const title = $('meta[property="og:title"]').attr('content') ||
                    $('h1[class*="product"]').first().text().trim() ||
                    $('h1').first().text().trim();

      // Use enhanced description extraction
      const { shortSummary, description, technicalSpecs } = this.extractDetailedDescription($);

      // Extract price with advanced method
      let priceMin = null;
      let priceMax = null;

      // Try JSON-LD first
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonLd = JSON.parse($(el).html() || '{}');
          if (jsonLd['@type'] === 'Product' && jsonLd.offers) {
            const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers];
            const prices = offers.map((offer: any) => {
              const price = offer.price || offer.lowPrice;
              return price ? parseFloat(price) * 100 : null;
            }).filter((p: any) => p !== null);

            if (prices.length > 0) {
              priceMin = Math.min(...prices);
              priceMax = Math.max(...prices);
            }
          }
        } catch (e) {
          // Ignore
        }
      });

      // If no price from JSON-LD, use advanced price extraction (includes Buy buttons)
      if (!priceMin) {
        const advancedPrices = this.extractPriceAdvanced($);
        priceMin = advancedPrices.min;
        priceMax = advancedPrices.max;
      }

      // Extract specs
      const components: Array<{ type: 'HARDWARE' | 'SOFTWARE'; name: string; spec?: string; required: boolean }> = [];

      $('[class*="spec"] li, [class*="feature"] li, .pd-g-specs li').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0 && text.length < 200) {
          const parts = text.split(':');
          if (parts.length === 2) {
            components.push({
              type: 'HARDWARE',
              name: parts[0].trim(),
              spec: parts[1].trim(),
              required: true,
            });
          } else if (text.length > 3) {
            components.push({
              type: 'HARDWARE',
              name: text,
              required: true,
            });
          }
        }
      });

      // Validate that we have minimum required data
      if (!title || title.length === 0 || title.includes('samsung.com')) {
        console.warn(`Failed to extract valid title from ${url}`);
        return null;
      }

      if (!priceMin) {
        console.warn(`Failed to extract price from ${url}`);
        return null;
      }

      console.log(`✓ Successfully scraped: ${title}`);

      // If we have technical specs, add them to components
      if (technicalSpecs) {
        const specsArray = technicalSpecs.split('|').map(s => s.trim()).filter(s => s.length > 0);
        specsArray.forEach(spec => {
          components.push({
            type: 'HARDWARE',
            name: spec.split(':')[0]?.trim() || spec,
            spec: spec.includes(':') ? spec.split(':')[1]?.trim() : undefined,
            required: true,
          });
        });
      }

      return {
        name: title,
        slug: slugify(title),
        shortSummary: shortSummary || description?.substring(0, 250) || undefined,
        description: description || undefined,
        costMinUSD: priceMin,
        costMaxUSD: priceMax || priceMin,
        manufacturer: 'Samsung',
        supplier: 'Samsung',
        scrapedAt: new Date(),
        dataSource: 'scraped',
        categories: ['Wearables'],
        operatingSystems: ['Wear OS'],
        versions: [],
        components: components.length > 0 ? components : [],
        dependencies: [],
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }
}
