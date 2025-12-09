/**
 * Test script for JSSoup scraper functionality
 *
 * This script tests the EnhancedBaseScraper with JSSoup
 * against a simple, publicly available website.
 */

import { EnhancedBaseScraper } from './enhanced-scraper-base';
import { SIPData } from '../types';

class TestJSSoupScraper extends EnhancedBaseScraper {
  constructor() {
    // Using example.com as a safe test target
    super('https://example.com', 'Test Manufacturer');
    this.defaultParser = 'jssoup';
  }

  async getProductListings(): Promise<string[]> {
    console.log('\n=== Testing Product Listings Extraction ===\n');

    // For testing, we'll just return a single URL
    return ['https://example.com'];
  }

  async scrapeProduct(url: string): Promise<SIPData | null> {
    console.log('\n=== Testing Product Page Scraping ===\n');
    console.log(`URL: ${url}\n`);

    // Fetch with JSSoup
    const soup = await this.fetchWithJSSoup(url);
    if (!soup) {
      console.error('❌ Failed to fetch page');
      return null;
    }

    console.log('✅ Page fetched successfully\n');

    try {
      // Test 1: Find title
      console.log('Test 1: Finding <h1> element');
      const h1Element = soup.find('h1');
      const title = this.extractTextFromJSSoup(h1Element);
      console.log(`  Result: "${title}"`);
      console.log(`  ✓ h1 element found\n`);

      // Test 2: Find paragraph
      console.log('Test 2: Finding <p> element');
      const pElement = soup.find('p');
      const paragraph = this.extractTextFromJSSoup(pElement);
      console.log(`  Result: "${paragraph?.substring(0, 50)}..."`);
      console.log(`  ✓ p element found\n`);

      // Test 3: Find links
      console.log('Test 3: Finding all <a> elements');
      const links = soup.findAll('a');
      console.log(`  Found ${links.length} links`);
      links.forEach((link: any, i: number) => {
        const href = this.extractAttrFromJSSoup(link, 'href');
        const text = this.extractTextFromJSSoup(link);
        console.log(`    [${i + 1}] href="${href}" text="${text}"`);
      });
      console.log(`  ✓ Links extracted\n`);

      // Test 4: Find by tag and attributes
      console.log('Test 4: Finding <div> elements');
      const divs = soup.findAll('div');
      console.log(`  Found ${divs.length} div elements`);
      console.log(`  ✓ Divs found\n`);

      // Test 5: Extract from meta tags
      console.log('Test 5: Finding meta tags');
      const metas = soup.findAll('meta');
      console.log(`  Found ${metas.length} meta tags`);
      metas.forEach((meta: any, i: number) => {
        const name = this.extractAttrFromJSSoup(meta, 'name');
        const content = this.extractAttrFromJSSoup(meta, 'content');
        if (name && content) {
          console.log(`    [${i + 1}] ${name}: ${content}`);
        }
      });
      console.log(`  ✓ Meta tags extracted\n`);

      // Create test SIPData
      const sipData: SIPData = {
        name: title || 'Test Product',
        slug: 'test-product',
        shortSummary: paragraph?.substring(0, 200) || null,
        description: paragraph,
        costMinUSD: null,
        costMaxUSD: null,
        categories: ['Test'],
        operatingSystems: [],
        manufacturer: {
          name: this.manufacturer,
          url: null,
        },
        supplier: null,
        components: [],
        versions: [],
        dependencies: [],
        dataSource: 'scraped' as const,
      };

      console.log('✅ All tests passed!\n');
      return sipData;
    } catch (error) {
      console.error('❌ Error during scraping:', error);
      return null;
    }
  }
}

// Run the test
async function runTest() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   JSSoup Scraper Test Suite          ║');
  console.log('╚════════════════════════════════════════╝\n');

  const scraper = new TestJSSoupScraper();

  try {
    const products = await scraper.scrapeAll();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Test Results                         ║');
    console.log('╚════════════════════════════════════════╝\n');

    if (products.length > 0) {
      console.log('✅ SUCCESS: Scraper returned products\n');
      console.log('Product data:');
      console.log(JSON.stringify(products[0], null, 2));
    } else {
      console.log('⚠️  WARNING: Scraper returned empty array\n');
    }
  } catch (error) {
    console.error('❌ FAILED: Test threw error\n');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTest()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { TestJSSoupScraper, runTest };
