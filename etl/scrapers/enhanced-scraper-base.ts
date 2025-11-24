import axios from 'axios';
import * as cheerio from 'cheerio';
import JSSoup from 'jssoup';
import { parse as parseHTML, HTMLElement } from 'node-html-parser';
import { chromium, Browser } from 'playwright';
import { SIPData } from '../types';
import { rateLimitedRequest, sleep, checkRobotsTxt } from '../utils';

/**
 * Enhanced Base Scraper with multiple parsing strategies
 *
 * Provides three parsing methods:
 * 1. Cheerio - Fast, jQuery-like selector syntax (existing)
 * 2. JSSoup - BeautifulSoup-like API, more robust for complex HTML
 * 3. node-html-parser - Modern, fast HTML parser with DOM API
 *
 * Choose the parser that best fits the site structure:
 * - Cheerio: Simple, well-structured HTML
 * - JSSoup: Complex nested structures, BeautifulSoup familiarity
 * - node-html-parser: Modern sites, need DOM manipulation
 */
export abstract class EnhancedBaseScraper {
  protected baseUrl: string;
  protected manufacturer: string;
  protected userAgent = 'SIP-Directory-Bot/1.0 (Educational Research; +https://github.com/sip-directory)';

  // Parser preference
  protected defaultParser: 'cheerio' | 'jssoup' | 'node-html-parser' = 'jssoup';

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

  // ==================== FETCHING METHODS ====================

  /**
   * Fetch HTML and return raw string
   * Use this when you want to parse with your preferred parser
   */
  protected async fetchRawHTML(url: string): Promise<string | null> {
    try {
      await sleep(2000);

      const html = await rateLimitedRequest<string>(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 30000,
      });

      return html;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch and parse with Cheerio (existing method)
   */
  protected async fetchWithCheerio(url: string): Promise<cheerio.CheerioAPI | null> {
    try {
      const html = await this.fetchRawHTML(url);
      if (!html) return null;
      return cheerio.load(html);
    } catch (error) {
      console.error(`Failed to parse with Cheerio ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch and parse with JSSoup (BeautifulSoup-like)
   *
   * Example usage:
   *   const soup = await this.fetchWithJSSoup(url);
   *   const title = soup.find('h1', { class: 'product-title' });
   *   const price = soup.find('span', { id: 'price' }).text;
   *   const images = soup.findAll('img', { class: 'gallery-image' });
   */
  protected async fetchWithJSSoup(url: string): Promise<any | null> {
    try {
      const html = await this.fetchRawHTML(url);
      if (!html) return null;
      return new JSSoup(html);
    } catch (error) {
      console.error(`Failed to parse with JSSoup ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch and parse with node-html-parser (modern DOM API)
   *
   * Example usage:
   *   const root = await this.fetchWithNodeParser(url);
   *   const title = root.querySelector('h1.product-title')?.text;
   *   const specs = root.querySelectorAll('div.spec-item');
   *   specs.forEach(spec => {
   *     const label = spec.querySelector('.label')?.text;
   *     const value = spec.querySelector('.value')?.text;
   *   });
   */
  protected async fetchWithNodeParser(url: string): Promise<HTMLElement | null> {
    try {
      const html = await this.fetchRawHTML(url);
      if (!html) return null;
      return parseHTML(html);
    } catch (error) {
      console.error(`Failed to parse with node-html-parser ${url}:`, error);
      return null;
    }
  }

  /**
   * Fetch HTML from JavaScript-heavy page using Playwright
   * Returns raw HTML string - parse with your preferred parser
   */
  protected async fetchHTMLWithBrowser(url: string): Promise<string | null> {
    let browser: Browser | null = null;

    try {
      await sleep(2000);

      browser = await chromium.launch({
        headless: true,
        timeout: 60000,
      });

      const page = await browser.newPage({
        userAgent: this.userAgent,
      });

      // Use 'domcontentloaded' instead of 'networkidle' for sites with continuous network activity
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for content to render
      await page.waitForTimeout(3000);

      const html = await page.content();
      await browser.close();

      return html;
    } catch (error) {
      console.error(`Failed to fetch ${url} with browser:`, error);
      if (browser) {
        await browser.close().catch(() => {});
      }
      return null;
    }
  }

  /**
   * Fetch with browser and parse with JSSoup
   */
  protected async fetchBrowserWithJSSoup(url: string): Promise<any | null> {
    const html = await this.fetchHTMLWithBrowser(url);
    if (!html) return null;
    return new JSSoup(html);
  }

  /**
   * Fetch with browser and parse with node-html-parser
   */
  protected async fetchBrowserWithNodeParser(url: string): Promise<HTMLElement | null> {
    const html = await this.fetchHTMLWithBrowser(url);
    if (!html) return null;
    return parseHTML(html);
  }

  // ==================== JSSOUP HELPER METHODS ====================

  /**
   * Extract text from JSSoup element
   */
  protected extractTextFromJSSoup(element: any): string | null {
    if (!element) return null;
    const text = element.text?.trim();
    return text || null;
  }

  /**
   * Extract attribute from JSSoup element
   */
  protected extractAttrFromJSSoup(element: any, attr: string): string | null {
    if (!element || !element.attrs) return null;
    return element.attrs[attr] || null;
  }

  /**
   * Find element by selector in JSSoup
   * Supports: tag name, class, id, and attribute selectors
   *
   * Examples:
   *   soup.find('div', { class: 'product' })
   *   soup.find('span', { id: 'price' })
   *   soup.find('a', { href: /^https/ })
   */
  protected findInJSSoup(soup: any, tag: string, attrs?: any): any {
    return soup.find(tag, attrs);
  }

  /**
   * Find all elements by selector in JSSoup
   */
  protected findAllInJSSoup(soup: any, tag: string, attrs?: any): any[] {
    return soup.findAll(tag, attrs) || [];
  }

  /**
   * Navigate to parent element in JSSoup
   */
  protected getParentInJSSoup(element: any): any {
    return element?.parent || null;
  }

  /**
   * Get next sibling in JSSoup
   */
  protected getNextSiblingInJSSoup(element: any): any {
    return element?.nextSibling || null;
  }

  /**
   * Get previous sibling in JSSoup
   */
  protected getPreviousSiblingInJSSoup(element: any): any {
    return element?.previousSibling || null;
  }

  /**
   * Get all children of element in JSSoup
   */
  protected getChildrenInJSSoup(element: any): any[] {
    return element?.contents || [];
  }

  // ==================== NODE-HTML-PARSER HELPER METHODS ====================

  /**
   * Extract text from node-html-parser element
   */
  protected extractTextFromNode(element: HTMLElement | null): string | null {
    if (!element) return null;
    const text = element.text?.trim();
    return text || null;
  }

  /**
   * Extract attribute from node-html-parser element
   */
  protected extractAttrFromNode(element: HTMLElement | null, attr: string): string | null {
    if (!element) return null;
    return element.getAttribute(attr) || null;
  }

  /**
   * Query selector in node-html-parser (CSS selector)
   */
  protected queryInNode(root: HTMLElement, selector: string): HTMLElement | null {
    return root.querySelector(selector);
  }

  /**
   * Query all matching elements in node-html-parser
   */
  protected queryAllInNode(root: HTMLElement, selector: string): HTMLElement[] {
    return root.querySelectorAll(selector);
  }

  // ==================== MAIN SCRAPING METHOD ====================

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
          continue;
        }
      }

      console.log(`✅ ${this.manufacturer}: ${sips.length}/${productUrls.length} products scraped\n`);
      return sips;
    } catch (error) {
      console.error(`❌ ${this.manufacturer} scraper failed:`, error);
      return [];
    }
  }

  // ==================== LEGACY CHEERIO HELPERS (backward compatible) ====================

  /**
   * Helper: Extract text from Cheerio element
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
   * Helper: Extract structured data from table (works with all parsers)
   */
  protected extractTableData(rows: any[]): Record<string, string> {
    const data: Record<string, string> = {};

    rows.forEach(row => {
      // Adapt based on parser type
      let key: string | null = null;
      let value: string | null = null;

      // Try to extract cells (works with most parsers)
      if (typeof row === 'object' && row.contents) {
        // JSSoup
        const cells = row.findAll('td');
        if (cells.length >= 2) {
          key = this.extractTextFromJSSoup(cells[0]);
          value = this.extractTextFromJSSoup(cells[1]);
        }
      }

      if (key && value) {
        data[key] = value;
      }
    });

    return data;
  }

  /**
   * Helper: Extract list of items (ul/ol)
   */
  protected extractList(listElement: any, parser: 'jssoup' | 'node'): string[] {
    const items: string[] = [];

    if (parser === 'jssoup') {
      const listItems = listElement?.findAll('li') || [];
      listItems.forEach((li: any) => {
        const text = this.extractTextFromJSSoup(li);
        if (text) items.push(text);
      });
    } else if (parser === 'node') {
      const listItems = listElement?.querySelectorAll('li') || [];
      listItems.forEach((li: HTMLElement) => {
        const text = this.extractTextFromNode(li);
        if (text) items.push(text);
      });
    }

    return items;
  }
}
