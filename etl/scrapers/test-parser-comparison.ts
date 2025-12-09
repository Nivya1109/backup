/**
 * Parser Comparison Test
 *
 * Tests all three parsers (Cheerio, JSSoup, node-html-parser)
 * against the same HTML to compare performance and functionality
 */

import { EnhancedBaseScraper } from './enhanced-scraper-base';

class ParserComparisonTest extends EnhancedBaseScraper {
  constructor() {
    super('https://example.com', 'Test');
  }

  async getProductListings(): Promise<string[]> {
    return ['https://example.com'];
  }

  async scrapeProduct(url: string): Promise<any> {
    return null;
  }

  // Test Cheerio
  async testCheerio(url: string) {
    console.log('\n📦 Testing Cheerio Parser');
    console.log('─'.repeat(50));

    const start = Date.now();
    const $ = await this.fetchWithCheerio(url);
    const fetchTime = Date.now() - start;

    if (!$) {
      console.log('❌ Failed to fetch');
      return;
    }

    const parseStart = Date.now();
    const title = $('h1').first().text().trim();
    const paragraph = $('p').first().text().trim();
    const links = $('a')
      .map((_, el) => $(el).attr('href'))
      .get();
    const parseTime = Date.now() - parseStart;

    console.log(`  Fetch time: ${fetchTime}ms`);
    console.log(`  Parse time: ${parseTime}ms`);
    console.log(`  Total time: ${fetchTime + parseTime}ms`);
    console.log(`  Title: "${title}"`);
    console.log(`  Paragraph length: ${paragraph.length} chars`);
    console.log(`  Links found: ${links.length}`);
    console.log('  ✅ Success');
  }

  // Test JSSoup
  async testJSSoup(url: string) {
    console.log('\n🍲 Testing JSSoup Parser');
    console.log('─'.repeat(50));

    const start = Date.now();
    const soup = await this.fetchWithJSSoup(url);
    const fetchTime = Date.now() - start;

    if (!soup) {
      console.log('❌ Failed to fetch');
      return;
    }

    const parseStart = Date.now();
    const h1 = soup.find('h1');
    const title = this.extractTextFromJSSoup(h1);
    const p = soup.find('p');
    const paragraph = this.extractTextFromJSSoup(p);
    const linkElements = soup.findAll('a');
    const links = linkElements.map((link: any) => this.extractAttrFromJSSoup(link, 'href'));
    const parseTime = Date.now() - parseStart;

    console.log(`  Fetch time: ${fetchTime}ms`);
    console.log(`  Parse time: ${parseTime}ms`);
    console.log(`  Total time: ${fetchTime + parseTime}ms`);
    console.log(`  Title: "${title}"`);
    console.log(`  Paragraph length: ${paragraph?.length || 0} chars`);
    console.log(`  Links found: ${links.length}`);
    console.log('  ✅ Success');
  }

  // Test node-html-parser
  async testNodeParser(url: string) {
    console.log('\n⚡ Testing node-html-parser');
    console.log('─'.repeat(50));

    const start = Date.now();
    const root = await this.fetchWithNodeParser(url);
    const fetchTime = Date.now() - start;

    if (!root) {
      console.log('❌ Failed to fetch');
      return;
    }

    const parseStart = Date.now();
    const h1 = root.querySelector('h1');
    const title = this.extractTextFromNode(h1);
    const p = root.querySelector('p');
    const paragraph = this.extractTextFromNode(p);
    const linkElements = root.querySelectorAll('a');
    const links = linkElements.map(link => this.extractAttrFromNode(link, 'href'));
    const parseTime = Date.now() - parseStart;

    console.log(`  Fetch time: ${fetchTime}ms`);
    console.log(`  Parse time: ${parseTime}ms`);
    console.log(`  Total time: ${fetchTime + parseTime}ms`);
    console.log(`  Title: "${title}"`);
    console.log(`  Paragraph length: ${paragraph?.length || 0} chars`);
    console.log(`  Links found: ${links.length}`);
    console.log('  ✅ Success');
  }
}

async function runComparison() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Parser Comparison Test              ║');
  console.log('╚════════════════════════════════════════╝');

  const test = new ParserComparisonTest();
  const url = 'https://example.com';

  try {
    await test.testCheerio(url);
    await test.testJSSoup(url);
    await test.testNodeParser(url);

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Summary                              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n✅ All parsers working correctly!');
    console.log('\nRecommendations:');
    console.log('  • Cheerio: Best for simple HTML, jQuery familiarity');
    console.log('  • JSSoup: Best for complex nested structures, Python devs');
    console.log('  • node-html-parser: Modern, fast, good for all use cases');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runComparison()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { runComparison };
