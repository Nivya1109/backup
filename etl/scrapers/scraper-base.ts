import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';
import { SIPData } from '../types';
import { rateLimitedRequest, sleep, checkRobotsTxt } from '../utils';

export abstract class BaseScraper {
  protected baseUrl: string;
  protected manufacturer: string;
  protected userAgent = 'SIP-Directory-Bot/1.0 (Educational Research; +https://github.com/sip-directory)';

  constructor(baseUrl: string, manufacturer: string) {
    this.baseUrl = baseUrl;
    this.manufacturer = manufacturer;
  }

  /**
   * Must be implemented by each scraper
   * Returns array of product URLs to scrape
   */
  abstract getProductListings(): Promise<string[]>;

  /**
   * Must be implemented by each scraper
   * Scrapes a single product page and returns SIPData
   */
  abstract scrapeProduct(url: string): Promise<SIPData | null>;

  /**
   * Fetch HTML from URL with rate limiting
   */
  protected async fetchHTML(url: string): Promise<cheerio.CheerioAPI | null> {
    try {
      // Rate limiting - 2 second delay
      await sleep(2000);

      const html = await rateLimitedRequest<string>(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 30000,
      });

      return cheerio.load(html);
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch HTML from JavaScript-heavy page using Playwright
   * Use this for sites that render content dynamically with JavaScript
   */
  protected async fetchHTMLWithBrowser(url: string): Promise<cheerio.CheerioAPI | null> {
    let browser: Browser | null = null;

    try {
      // Rate limiting - 2 second delay
      await sleep(2000);

      // Launch headless browser
      browser = await chromium.launch({
        headless: true,
        timeout: 60000,
      });

      const page = await browser.newPage({
        userAgent: this.userAgent,
      });

      // Navigate with more lenient wait strategy
      // Use 'domcontentloaded' instead of 'networkidle' for sites with continuous network activity
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for content to render
      await page.waitForTimeout(3000);

      // Get the rendered HTML
      const html = await page.content();

      await browser.close();

      return cheerio.load(html);
    } catch (error) {
      console.error(`Failed to fetch ${url} with browser:`, error);
      if (browser) {
        await browser.close().catch(() => {});
      }
      return null;
    }
  }

  /**
   * Main scraping method - called by pipeline
   */
  async scrapeAll(): Promise<SIPData[]> {
    console.log(`\n🔍 Scraping ${this.manufacturer}...`);

    // Check robots.txt
    const allowed = await checkRobotsTxt(this.baseUrl, this.userAgent);
    if (!allowed) {
      console.warn(`⚠️  ${this.manufacturer} blocked by robots.txt, skipping`);
      return [];
    }

    try {
      // Get product URLs
      const productUrls = await this.getProductListings();
      console.log(`📋 Found ${productUrls.length} products for ${this.manufacturer}`);

      if (productUrls.length === 0) {
        return [];
      }

      // Scrape each product
      const sips: SIPData[] = [];
      for (let i = 0; i < productUrls.length; i++) {
        const url = productUrls[i];
        console.log(`  [${i + 1}/${productUrls.length}] Scraping ${url}`);

        try {
          const sip = await this.scrapeProduct(url);
          if (sip) {
            sips.push(sip);
            console.log(`  ✓ ${sip.name}`);
          } else {
            console.log(`  ✗ Failed to extract data`);
          }
        } catch (error) {
          console.error(`  ✗ Error scraping ${url}:`, error);
          continue; // Continue with next product
        }
      }

      console.log(`✅ ${this.manufacturer}: ${sips.length}/${productUrls.length} products scraped\n`);
      return sips;
    } catch (error) {
      console.error(`❌ ${this.manufacturer} scraper failed:`, error);
      return [];
    }
  }

  /**
   * Helper: Extract text from element
   */
  protected extractText($: cheerio.CheerioAPI, selector: string): string | null {
    const text = $(selector).first().text().trim();
    return text || null;
  }

  /**
   * Helper: Extract price from text (handles $, USD, etc.)
   */
  protected extractPrice(text: string): number | null {
    if (!text) return null;

    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);

    if (isNaN(price) || price <= 0) return null;

    // Convert to cents
    return Math.round(price * 100);
  }

  /**
   * Helper: Extract version number from text
   */
  protected extractVersion(text: string): string | null {
    const match = text.match(/(\d+\.?\d*)/);
    return match ? match[1] : null;
  }

  /**
   * Helper: Clean and normalize text
   */
  protected cleanText(text: string | null | undefined): string | null {
    if (!text) return null;
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * Advanced price extraction - looks for price in multiple locations
   * including Buy buttons, price containers, and data attributes
   */
  protected extractPriceAdvanced($: cheerio.CheerioAPI): { min: number | null; max: number | null } {
    const prices: number[] = [];

    // Strategy 1: Common price selectors
    const priceSelectors = [
      '[data-price]',
      '[data-product-price]',
      '.price',
      '.product-price',
      '[class*="price"]',
      '[class*="Price"]',
      '[itemprop="price"]',
      '[data-autom="product-price"]',
    ];

    for (const selector of priceSelectors) {
      $(selector).each((_, el) => {
        const priceText = $(el).text() || $(el).attr('content') || $(el).attr('data-price') || '';
        const price = this.extractPrice(priceText);
        if (price) prices.push(price);
      });
    }

    // Strategy 2: Look for Buy/Add to Cart buttons with price nearby
    const buyButtonSelectors = [
      'button[class*="buy"]',
      'button[class*="cart"]',
      'a[class*="buy"]',
      'a[class*="cart"]',
      '[data-autom*="buy"]',
      '[data-autom*="cart"]',
    ];

    for (const selector of buyButtonSelectors) {
      $(selector).each((_, el) => {
        // Check button text itself
        const buttonText = $(el).text();
        let price = this.extractPrice(buttonText);
        if (price) {
          prices.push(price);
          return;
        }

        // Check parent container
        const parent = $(el).parent();
        const parentText = parent.text();
        price = this.extractPrice(parentText);
        if (price) prices.push(price);

        // Check siblings
        const siblings = $(el).siblings();
        siblings.each((_, sibling) => {
          const siblingText = $(sibling).text();
          const sibPrice = this.extractPrice(siblingText);
          if (sibPrice) prices.push(sibPrice);
        });
      });
    }

    // Strategy 3: Look for "from $X" or "starting at $X" patterns
    const bodyText = $('body').text();
    const fromPatterns = [
      /from\s+\$?([\d,]+\.?\d*)/gi,
      /starting at\s+\$?([\d,]+\.?\d*)/gi,
      /as low as\s+\$?([\d,]+\.?\d*)/gi,
    ];

    for (const pattern of fromPatterns) {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const price = this.extractPrice(match[1]);
        if (price) prices.push(price);
      }
    }

    // Return min and max prices
    if (prices.length === 0) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  /**
   * Extract detailed product description from multiple sources
   * Looks for description meta tags, product details, tech specs, etc.
   */
  protected extractDetailedDescription($: cheerio.CheerioAPI): {
    shortSummary: string | null;
    description: string | null;
    technicalSpecs: string | null;
  } {
    let shortSummary: string | null = null;
    let description: string | null = null;
    let technicalSpecs: string | null = null;

    // Extract short summary from meta tags
    const metaDescription = $('meta[name="description"]').attr('content') ||
                           $('meta[property="og:description"]').attr('content') ||
                           $('meta[name="twitter:description"]').attr('content');

    if (metaDescription) {
      shortSummary = this.cleanText(metaDescription);
      if (shortSummary && shortSummary.length > 500) {
        shortSummary = shortSummary.substring(0, 497) + '...';
      }
    }

    // Extract main description from common selectors
    const descriptionSelectors = [
      '[class*="description"]',
      '[class*="Description"]',
      '[class*="overview"]',
      '[class*="Overview"]',
      '[data-autom*="description"]',
      '[itemprop="description"]',
      '.product-info',
      '.product-details',
      '#product-description',
    ];

    for (const selector of descriptionSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 50) { // Only use if substantial
          description = this.cleanText(text);
          if (description && description.length > 2000) {
            description = description.substring(0, 1997) + '...';
          }
          break;
        }
      }
    }

    // If no description found, use first substantial paragraph
    if (!description) {
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 100) {
          description = this.cleanText(text);
          if (description && description.length > 2000) {
            description = description.substring(0, 1997) + '...';
          }
          return false; // break
        }
      });
    }

    // Extract technical specifications
    const techSpecSelectors = [
      '[class*="spec"]',
      '[class*="Spec"]',
      '[class*="technical"]',
      '[class*="Technical"]',
      '[class*="feature"]',
      '[class*="Feature"]',
      '.tech-details',
      '#specifications',
      '#tech-specs',
    ];

    const techSpecs: string[] = [];
    for (const selector of techSpecSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && text.length < 500) {
          techSpecs.push(this.cleanText(text) || '');
        }
      });
    }

    if (techSpecs.length > 0) {
      technicalSpecs = techSpecs.slice(0, 10).join(' | '); // Join first 10 specs
      if (technicalSpecs.length > 2000) {
        technicalSpecs = technicalSpecs.substring(0, 1997) + '...';
      }
    }

    return {
      shortSummary,
      description,
      technicalSpecs,
    };
  }

  /**
   * Extract product features as an array
   */
  protected extractFeatures($: cheerio.CheerioAPI): string[] {
    const features: string[] = [];

    // Look for feature lists
    const featureSelectors = [
      '[class*="feature"] li',
      '[class*="Feature"] li',
      '.highlights li',
      '.key-features li',
      '[data-autom*="feature"] li',
    ];

    for (const selector of featureSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && text.length < 200) {
          features.push(this.cleanText(text) || '');
        }
      });
      if (features.length > 0) break; // Use first successful selector
    }

    return features.slice(0, 20); // Limit to 20 features
  }
}
