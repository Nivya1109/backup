import { BaseScraper } from '../../scraper-base'
import { SIPData } from '../../../types'
import { slugify } from '../../../utils'

/**
 * Apple Watch Scraper
 *
 * Strategy: Real-time scraping of Apple Watch product pages
 * Apple's website is heavily JavaScript-rendered, requiring browser automation
 * Returns null if scraping fails - no fallback data
 */
export class AppleScraper extends BaseScraper {
  constructor() {
    super('https://www.apple.com', 'Apple')
  }

  async getProductListings(): Promise<string[]> {
    try {
      // Fetch the main Apple Watch page with browser for dynamic content
      const $ = await this.fetchHTMLWithBrowser('https://www.apple.com/watch/');

      if (!$) {
        console.warn('Failed to fetch Apple Watch main page');
        return [];
      }

      const productUrls = new Set<string>();

      // Method 1: Find links to specific product pages
      $('a[href*="/apple-watch-"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/buy') && !href.includes('/compare')) {
          // Clean and normalize the URL
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.apple.com${url}`;
          }
          // Remove query params and anchors
          url = url.split('?')[0].split('#')[0];
          // Ensure it ends with /
          if (!url.endsWith('/')) {
            url += '/';
          }
          productUrls.add(url);
        }
      });

      // Method 2: Look for navigation links and product cards
      $('nav a[href*="/watch"], [class*="product"] a[href*="/apple-watch"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.includes('/buy') && !href.includes('/compare') && !href.includes('/bands')) {
          let url = href;
          if (url.startsWith('/')) {
            url = `https://www.apple.com${url}`;
          }
          url = url.split('?')[0].split('#')[0];
          if (!url.endsWith('/')) {
            url += '/';
          }
          productUrls.add(url);
        }
      });

      // Filter to only actual product pages (not general watch page)
      const validUrls = Array.from(productUrls).filter(url => {
        return url.match(/apple-watch-(series-\d+|ultra-\d+|se-\d+|nike|hermes)/i);
      });

      if (validUrls.length > 0) {
        console.log(`Discovered ${validUrls.length} Apple Watch product URLs`);
        return validUrls;
      }

      console.warn('No products discovered');
      return [];

    } catch (error) {
      console.error('Error discovering Apple Watch products:', error);
      return [];
    }
  }

  async scrapeProduct(url: string): Promise<SIPData | null> {
    try {
      // Try to fetch with Playwright first (Apple uses heavy JavaScript rendering)
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

      // Extract basic metadata
      const title = $('meta[property="og:title"]').attr('content') ||
                    $('h1.typography-headline').first().text().trim() ||
                    $('h1').first().text().trim();

      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';

      // Extract pricing from meta tags or structured data
      let priceMin = null;
      let priceMax = null;

      // Try to extract price from structured data
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

      // Try to extract price from page text with multiple selectors
      if (!priceMin) {
        const priceSelectors = [
          '.typography-hero-prices',
          '.pricing',
          '[class*="price"]',
          '[data-autom="prices"]',
          '.as-price-currentprice',
          '.rf-bfe-dimension-price',
          'span[data-dimension-price]',
        ];

        for (const selector of priceSelectors) {
          const priceText = $(selector).first().text().match(/\$(\d+)/);
          if (priceText) {
            priceMin = parseInt(priceText[1]) * 100;
            break;
          }
        }
      }

      // Extract tech specs if available
      const components: Array<{ type: 'HARDWARE' | 'SOFTWARE'; name: string; spec?: string; required: boolean }> = [];

      // Look for tech specs sections
      $('[class*="tech-specs"] li, .specs-list li, [data-component="TechSpecs"] li').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 0 && text.length < 200) {
          // Try to split into name and spec
          const parts = text.split(':');
          if (parts.length === 2) {
            components.push({
              type: 'HARDWARE',
              name: parts[0].trim(),
              spec: parts[1].trim(),
              required: true,
            });
          } else {
            components.push({
              type: 'HARDWARE',
              name: text,
              required: true,
            });
          }
        }
      });

      // Validate that we have minimum required data
      if (!title || title.length === 0 || title.includes('apple.com')) {
        console.warn(`Failed to extract valid title from ${url}`);
        return null;
      }

      if (!priceMin) {
        console.warn(`Failed to extract price from ${url}`);
        return null;
      }

      console.log(`✓ Successfully scraped: ${title}`);

      const sipData: SIPData = {
        name: title,
        slug: slugify(title),
        shortSummary: description?.substring(0, 250) || undefined,
        description: description || undefined,
        costMinUSD: priceMin,
        costMaxUSD: priceMax || priceMin,
        manufacturer: 'Apple',
        supplier: 'Apple',
        scrapedAt: new Date(),
        dataSource: 'scraped',
        categories: ['Wearables'],
        operatingSystems: ['watchOS'],
        versions: [],
        components: components.length > 0 ? components : [],
        dependencies: [],
      };

      return sipData;

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }
}
