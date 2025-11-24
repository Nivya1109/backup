import { BaseScraper } from '../../scraper-base';
import { SIPData } from '../../../types';
import { slugify } from '../../../utils';

/**
 * Garmin Smartwatch Scraper
 * Real-time scraping of Garmin wearable product pages
 * Returns null if scraping fails - no fallback data
 */
export class GarminScraper extends BaseScraper {
  constructor() {
    super('https://www.garmin.com', 'Garmin');
  }

  async getProductListings(): Promise<string[]> {
    try {
      // Fetch the Garmin wearables product listing page with browser for dynamic content
      const $ = await this.fetchHTMLWithBrowser('https://www.garmin.com/en-US/c/wearables-smartwatches/');

      if (!$) {
        console.warn('Failed to fetch Garmin wearables main page');
        return [];
      }

      const productUrls = new Set<string>();

      // Method 1: Find product links with /p/ pattern (Garmin product URLs)
      $('a[href*="/p/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/buy') && !href.includes('/compare')) {
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.garmin.com${url}`;
          }
          // Remove query params and anchors
          url = url.split('?')[0].split('#')[0];
          // Only include product pages (format: /en-US/p/######)
          if (url.match(/\/p\/\d+\/?$/)) {
            productUrls.add(url);
          }
        }
      });

      // Method 2: Look for product cards and tiles
      $('[class*="product"] a, [class*="card"] a, [class*="tile"] a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/p/') && !href.includes('/buy')) {
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.garmin.com${url}`;
          }
          url = url.split('?')[0].split('#')[0];
          if (url.match(/\/p\/\d+\/?$/)) {
            productUrls.add(url);
          }
        }
      });

      const validUrls = Array.from(productUrls);

      if (validUrls.length > 0) {
        console.log(`Discovered ${validUrls.length} Garmin product URLs`);
        return validUrls;
      }

      console.warn('No Garmin products discovered');
      return [];

    } catch (error) {
      console.error('Error discovering Garmin products:', error);
      return [];
    }
  }

  async scrapeProduct(url: string): Promise<SIPData | null> {
    try {
      // Try to fetch with Playwright first (Garmin may use JavaScript rendering)
      let $ = await this.fetchHTMLWithBrowser(url);

      // Fallback to regular fetch if browser fails
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

      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';

      // Extract price
      let priceMin = null;
      let priceMax = null;

      // Try JSON-LD structured data
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
          // Ignore JSON parse errors
        }
      });

      // Try price selectors
      if (!priceMin) {
        const priceSelectors = [
          '[class*="price"]',
          '[data-price]',
          '.product-price',
          '.price-value',
        ];

        for (const selector of priceSelectors) {
          const priceText = $(selector).first().text().match(/\$?([\d,]+)\.?(\d{2})?/);
          if (priceText) {
            const dollars = priceText[1].replace(/,/g, '');
            const cents = priceText[2] || '00';
            priceMin = parseInt(dollars) * 100 + parseInt(cents);
            break;
          }
        }
      }

      // Extract specs/components
      const components: Array<{ type: 'HARDWARE' | 'SOFTWARE'; name: string; spec?: string; required: boolean }> = [];

      $('[class*="spec"] li, [class*="feature"] li, .product-specs li').each((_, el) => {
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
      if (!title || title.length === 0 || title.includes('garmin.com')) {
        console.warn(`Failed to extract valid title from ${url}`);
        return null;
      }

      if (!priceMin) {
        console.warn(`Failed to extract price from ${url}`);
        return null;
      }

      console.log(`✓ Successfully scraped: ${title}`);

      return {
        name: title,
        slug: slugify(title),
        shortSummary: description?.substring(0, 250) || undefined,
        description: description || undefined,
        costMinUSD: priceMin,
        costMaxUSD: priceMax || priceMin,
        manufacturer: 'Garmin',
        supplier: 'Garmin',
        scrapedAt: new Date(),
        dataSource: 'scraped',
        categories: ['Wearables'],
        operatingSystems: ['Garmin OS'],
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
