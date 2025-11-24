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
}
