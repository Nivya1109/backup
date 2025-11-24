import { EnhancedBaseScraper } from './enhanced-scraper-base';
import { SIPData } from '../types';

/**
 * Example Scraper using JSSoup (BeautifulSoup-like API)
 *
 * This is a template showing how to use JSSoup for web scraping.
 * Demonstrates common patterns like:
 * - Finding elements by tag, class, id
 * - Navigating the DOM tree
 * - Extracting text and attributes
 * - Handling nested structures
 */
export class ExampleJSSoupScraper extends EnhancedBaseScraper {
  constructor() {
    super('https://example.com', 'Example Manufacturer');
    this.defaultParser = 'jssoup'; // Use JSSoup by default
  }

  /**
   * Get list of product URLs to scrape
   */
  async getProductListings(): Promise<string[]> {
    console.log('📋 Fetching product listings...');

    // Fetch and parse the product listing page
    const soup = await this.fetchWithJSSoup(`${this.baseUrl}/products`);
    if (!soup) return [];

    const productUrls: string[] = [];

    // Example 1: Find all product links by class
    // <a class="product-link" href="/product/abc-123">Product Name</a>
    const productLinks = this.findAllInJSSoup(soup, 'a', { class: 'product-link' });

    for (const link of productLinks) {
      const href = this.extractAttrFromJSSoup(link, 'href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        productUrls.push(fullUrl);
      }
    }

    // Example 2: Find links in a specific container
    // <div class="product-grid">
    //   <a href="/product/1">...</a>
    //   <a href="/product/2">...</a>
    // </div>
    const productGrid = this.findInJSSoup(soup, 'div', { class: 'product-grid' });
    if (productGrid) {
      const gridLinks = this.findAllInJSSoup(productGrid, 'a');
      for (const link of gridLinks) {
        const href = this.extractAttrFromJSSoup(link, 'href');
        if (href && href.includes('/product/')) {
          productUrls.push(`${this.baseUrl}${href}`);
        }
      }
    }

    console.log(`✓ Found ${productUrls.length} product URLs`);
    return [...new Set(productUrls)]; // Remove duplicates
  }

  /**
   * Scrape individual product page
   */
  async scrapeProduct(url: string): Promise<SIPData | null> {
    // Fetch and parse with JSSoup
    const soup = await this.fetchWithJSSoup(url);
    if (!soup) return null;

    try {
      // ============ BASIC INFORMATION ============

      // Example: Extract title
      // <h1 class="product-title">Product Name XYZ</h1>
      const titleElement = this.findInJSSoup(soup, 'h1', { class: 'product-title' });
      const name = this.extractTextFromJSSoup(titleElement);
      if (!name) {
        console.error('  ✗ Could not extract product name');
        return null;
      }

      // Example: Extract description from meta tag
      // <meta name="description" content="Product description here" />
      const metaDesc = this.findInJSSoup(soup, 'meta', { name: 'description' });
      const description = this.extractAttrFromJSSoup(metaDesc, 'content');

      // Example: Extract short summary
      // <div class="product-summary">Brief summary text</div>
      const summaryElement = this.findInJSSoup(soup, 'div', { class: 'product-summary' });
      const shortSummary = this.extractTextFromJSSoup(summaryElement);

      // ============ PRICING ============

      // Example: Extract price
      // <span class="price" data-price="299.99">$299.99</span>
      const priceElement = this.findInJSSoup(soup, 'span', { class: 'price' });
      let costMinUSD: number | null = null;
      let costMaxUSD: number | null = null;

      if (priceElement) {
        // Try data attribute first
        const dataPrice = this.extractAttrFromJSSoup(priceElement, 'data-price');
        if (dataPrice) {
          costMinUSD = this.extractPrice(dataPrice);
        } else {
          // Fall back to text content
          const priceText = this.extractTextFromJSSoup(priceElement);
          if (priceText) {
            costMinUSD = this.extractPrice(priceText);
          }
        }
      }

      // Example: Handle price ranges
      // <span class="price-from">From $199</span>
      // <span class="price-to">To $399</span>
      const priceFrom = this.findInJSSoup(soup, 'span', { class: 'price-from' });
      const priceTo = this.findInJSSoup(soup, 'span', { class: 'price-to' });

      if (priceFrom && priceTo) {
        const fromText = this.extractTextFromJSSoup(priceFrom);
        const toText = this.extractTextFromJSSoup(priceTo);
        if (fromText) costMinUSD = this.extractPrice(fromText);
        if (toText) costMaxUSD = this.extractPrice(toText);
      }

      // ============ CATEGORIES & OS ============

      // Example: Extract categories from badges
      // <span class="badge category">Wearables</span>
      // <span class="badge category">Fitness</span>
      const categoryBadges = this.findAllInJSSoup(soup, 'span', { class: 'badge category' });
      const categories = categoryBadges
        .map((badge: any) => this.extractTextFromJSSoup(badge))
        .filter(Boolean);

      // Example: Extract OS from specs table
      // <table class="specs">
      //   <tr><td>Operating System</td><td>Linux 5.15</td></tr>
      // </table>
      const specsTable = this.findInJSSoup(soup, 'table', { class: 'specs' });
      const osNames: string[] = [];

      if (specsTable) {
        const rows = this.findAllInJSSoup(specsTable, 'tr');
        for (const row of rows) {
          const cells = this.findAllInJSSoup(row, 'td');
          if (cells.length >= 2) {
            const label = this.extractTextFromJSSoup(cells[0]);
            const value = this.extractTextFromJSSoup(cells[1]);

            if (label?.toLowerCase().includes('operating system') && value) {
              osNames.push(value);
            }
          }
        }
      }

      // ============ COMPONENTS ============

      // Example: Extract hardware components
      // <div class="hardware-specs">
      //   <div class="spec-item">
      //     <span class="spec-name">Processor</span>
      //     <span class="spec-value">ARM Cortex-M4</span>
      //   </div>
      // </div>
      const hardwareContainer = this.findInJSSoup(soup, 'div', { class: 'hardware-specs' });
      const hardwareComponents: Array<{ name: string; spec: string; required: boolean }> = [];

      if (hardwareContainer) {
        const specItems = this.findAllInJSSoup(hardwareContainer, 'div', { class: 'spec-item' });
        for (const item of specItems) {
          const nameElem = this.findInJSSoup(item, 'span', { class: 'spec-name' });
          const valueElem = this.findInJSSoup(item, 'span', { class: 'spec-value' });

          const componentName = this.extractTextFromJSSoup(nameElem);
          const componentSpec = this.extractTextFromJSSoup(valueElem);

          if (componentName && componentSpec) {
            hardwareComponents.push({
              name: componentName,
              spec: componentSpec,
              required: true, // Assume required unless specified otherwise
            });
          }
        }
      }

      // Example: Extract software components from a list
      // <ul class="software-list">
      //   <li>Bluetooth Stack v5.0</li>
      //   <li>WiFi Driver</li>
      // </ul>
      const softwareList = this.findInJSSoup(soup, 'ul', { class: 'software-list' });
      const softwareComponents: Array<{ name: string; required: boolean }> = [];

      if (softwareList) {
        const items = this.extractList(softwareList, 'jssoup');
        items.forEach(item => {
          softwareComponents.push({
            name: item,
            required: false,
          });
        });
      }

      // ============ VERSIONS ============

      // Example: Extract version information
      // <div class="version-info">
      //   <span class="version">v2.5.1</span>
      //   <span class="release-date">2025-01-15</span>
      // </div>
      const versionContainer = this.findInJSSoup(soup, 'div', { class: 'version-info' });
      const versions: Array<{ name: string; releasedAt?: Date; notes?: string }> = [];

      if (versionContainer) {
        const versionText = this.extractTextFromJSSoup(
          this.findInJSSoup(versionContainer, 'span', { class: 'version' })
        );
        const releaseDateText = this.extractTextFromJSSoup(
          this.findInJSSoup(versionContainer, 'span', { class: 'release-date' })
        );

        if (versionText) {
          versions.push({
            name: versionText,
            releasedAt: releaseDateText ? new Date(releaseDateText) : undefined,
          });
        }
      }

      // ============ MANUFACTURER & SUPPLIER ============

      // Example: Extract manufacturer from footer or about section
      const manufacturerElem = this.findInJSSoup(soup, 'span', { class: 'manufacturer-name' });
      const manufacturerName = this.extractTextFromJSSoup(manufacturerElem) || this.manufacturer;

      const manufacturerLink = this.findInJSSoup(soup, 'a', { class: 'manufacturer-link' });
      const manufacturerUrl = this.extractAttrFromJSSoup(manufacturerLink, 'href');

      // ============ CONSTRUCT SIPDATA ============

      const sipData: SIPData = {
        name: this.cleanText(name)!,
        slug: this.generateSlug(name),
        shortSummary: this.cleanText(shortSummary),
        description: this.cleanText(description),
        costMinUSD,
        costMaxUSD,
        categories: categories.length > 0 ? categories : ['Uncategorized'],
        operatingSystems: osNames.length > 0 ? osNames : [],
        manufacturer: {
          name: manufacturerName,
          url: manufacturerUrl,
        },
        supplier: null, // Extract if available
        components: [
          ...hardwareComponents.map(c => ({ ...c, type: 'HARDWARE' as const })),
          ...softwareComponents.map(c => ({ ...c, type: 'SOFTWARE' as const, spec: null })),
        ],
        versions,
        dependencies: [], // Extract if available
        dataSource: 'scraped' as const,
      };

      return sipData;
    } catch (error) {
      console.error(`  ✗ Error parsing product data:`, error);
      return null;
    }
  }

  /**
   * Helper: Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/**
 * USAGE EXAMPLE:
 *
 * import { ExampleJSSoupScraper } from './example-jssoup-scraper';
 *
 * const scraper = new ExampleJSSoupScraper();
 * const products = await scraper.scrapeAll();
 * console.log(`Scraped ${products.length} products`);
 */
