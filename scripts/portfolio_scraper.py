"""
Portfolio Scraper for Danish Investors
======================================
Scrapes portfolio pages from Danish VCs, accelerators, and incubators
to identify startups in their portfolios.

Usage:
    python portfolio_scraper.py                    # Scrape all investors
    python portfolio_scraper.py --investor seed-capital  # Scrape specific investor
    python portfolio_scraper.py --limit 5          # Limit to 5 investors
"""

import asyncio
import json
import argparse
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")
    exit(1)

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
INVESTORS_FILE = DATA_DIR / "investors.json"
OUTPUT_FILE = DATA_DIR / "companies.json"
RAW_OUTPUT_FILE = DATA_DIR / "portfolio_raw.json"


def load_investors():
    """Load the investors seed list."""
    with open(INVESTORS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


async def extract_portfolio_links(page, base_url):
    """Extract all portfolio company links from a page."""
    links = await page.evaluate("""
        (baseUrl) => {
            const links = [];
            const seen = new Set();
            
            // Find all links on the page
            document.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                const text = a.textContent?.trim();
                const img = a.querySelector('img');
                const imgSrc = img?.src || '';
                const imgAlt = img?.alt || '';
                
                // Skip navigation, social, and utility links
                const skipPatterns = [
                    'linkedin', 'twitter', 'facebook', 'instagram', 'youtube',
                    'mailto:', 'tel:', '#', 'javascript:',
                    '/about', '/team', '/contact', '/news', '/blog', '/careers',
                    '/privacy', '/terms', '/cookie', '/legal',
                    '/login', '/signup', '/register'
                ];
                
                if (href && !skipPatterns.some(p => href.toLowerCase().includes(p))) {
                    // Check if this looks like a portfolio company link
                    const isPortfolioLink = 
                        (text && text.length > 1 && text.length < 100) ||
                        imgSrc || imgAlt;
                    
                    if (isPortfolioLink && !seen.has(href)) {
                        seen.add(href);
                        
                        // Try to determine if this is an external company link
                        const fullUrl = href.startsWith('http') ? href : baseUrl + href;
                        const isExternal = !fullUrl.includes(new URL(baseUrl).hostname);
                        
                        links.push({
                            href: fullUrl,
                            text: text || imgAlt || '',
                            hasLogo: !!imgSrc,
                            logoSrc: imgSrc,
                            isExternal: isExternal
                        });
                    }
                }
            });
            
            return links;
        }
    """, base_url)
    
    return links


async def extract_portfolio_cards(page):
    """Extract structured portfolio cards from common patterns."""
    cards = await page.evaluate("""
        () => {
            const companies = [];
            
            // Common portfolio card selectors
            const cardSelectors = [
                '[class*="portfolio"] [class*="card"]',
                '[class*="portfolio"] [class*="item"]',
                '[class*="company"] [class*="card"]',
                '[class*="investment"] [class*="item"]',
                '.portfolio-grid > div',
                '.companies-grid > div',
                '[class*="startup"]',
                'article[class*="company"]'
            ];
            
            const cards = document.querySelectorAll(cardSelectors.join(', '));
            
            cards.forEach(card => {
                const nameEl = card.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
                const linkEl = card.querySelector('a');
                const imgEl = card.querySelector('img');
                const descEl = card.querySelector('p, [class*="desc"]');
                
                const name = nameEl?.textContent?.trim();
                const href = linkEl?.getAttribute('href');
                const logo = imgEl?.src;
                const description = descEl?.textContent?.trim();
                
                if (name && name.length > 1 && name.length < 100) {
                    companies.push({
                        name,
                        website: href || '',
                        logo: logo || '',
                        description: description || ''
                    });
                }
            });
            
            return companies;
        }
    """)
    
    return cards


async def scrape_investor_portfolio(page, investor):
    """Scrape the portfolio page of a single investor."""
    portfolio_url = investor.get('portfolioUrl') or investor.get('website') + '/portfolio'
    print(f"\n  Scraping: {portfolio_url}")
    
    try:
        await page.goto(portfolio_url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)  # Wait for dynamic content
        
        # Try structured extraction first
        cards = await extract_portfolio_cards(page)
        
        if len(cards) > 2:
            print(f"    ✓ Found {len(cards)} portfolio companies (structured)")
            return cards
        
        # Fall back to link extraction
        base_url = f"{urlparse(portfolio_url).scheme}://{urlparse(portfolio_url).netloc}"
        links = await extract_portfolio_links(page, base_url)
        
        # Filter to likely company links
        company_links = [
            link for link in links 
            if link.get('isExternal') or link.get('hasLogo')
        ]
        
        if company_links:
            print(f"    ✓ Found {len(company_links)} potential portfolio links")
            return [
                {
                    'name': link.get('text', '').strip(),
                    'website': link.get('href', ''),
                    'logo': link.get('logoSrc', ''),
                    'description': ''
                }
                for link in company_links
                if link.get('text', '').strip()
            ]
        
        print(f"    ⚠ No portfolio companies found")
        return []
        
    except PlaywrightTimeout:
        print(f"    ✗ Timeout loading page")
        return []
    except Exception as e:
        print(f"    ✗ Error: {e}")
        return []


def format_startups(raw_companies, investor):
    """Format extracted companies as startups."""
    formatted = []
    seen_ids = set()
    
    for company in raw_companies:
        name = company.get('name', '').strip()
        if not name or len(name) < 2:
            continue
            
        # Create ID from name
        company_id = name.lower().replace(' ', '-').replace('.', '').replace(',', '')
        company_id = ''.join(c for c in company_id if c.isalnum() or c == '-')
        
        if company_id in seen_ids or len(company_id) < 2:
            continue
        seen_ids.add(company_id)
        
        formatted.append({
            'id': company_id,
            'name': name,
            'type': 'startup',
            'logo': company.get('logo', ''),
            'website': company.get('website', ''),
            'industry': '',
            'description': company.get('description', ''),
            'employees': 0,
            'founded': None,
            'location': 'Denmark',
            'funding': '',
            'valuation': '',
            'coordinates': None,
            'isHiring': False,
            'investors': [investor['name']],
            'source': f"Portfolio of {investor['name']}",
            'lastUpdated': datetime.now().isoformat()
        })
    
    return formatted


async def scrape_all_portfolios(investor_id=None, limit=None):
    """Scrape portfolios from all or selected investors."""
    print("=" * 60)
    print("Danish Investor Portfolio Scraper")
    print("=" * 60)
    
    investors = load_investors()
    
    if investor_id:
        investors = [inv for inv in investors if inv['id'] == investor_id]
        if not investors:
            print(f"✗ Investor '{investor_id}' not found")
            return []
    
    if limit:
        investors = investors[:limit]
    
    print(f"Scraping {len(investors)} investors...")
    
    all_startups = []
    raw_data = {}
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,  # Run headless for batch scraping
            args=['--no-sandbox']
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        page = await context.new_page()
        
        for i, investor in enumerate(investors, 1):
            print(f"\n[{i}/{len(investors)}] {investor['name']}")
            
            raw_companies = await scrape_investor_portfolio(page, investor)
            raw_data[investor['id']] = raw_companies
            
            startups = format_startups(raw_companies, investor)
            
            # Merge with existing, avoid duplicates
            for startup in startups:
                existing = next((s for s in all_startups if s['id'] == startup['id']), None)
                if existing:
                    # Add investor to existing startup's investor list
                    if investor['name'] not in existing.get('investors', []):
                        existing.setdefault('investors', []).append(investor['name'])
                else:
                    all_startups.append(startup)
        
        await browser.close()
    
    # Save results
    print(f"\n{'=' * 60}")
    print(f"✓ Total unique startups found: {len(all_startups)}")
    
    # Save raw data
    with open(RAW_OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(raw_data, f, indent=2, ensure_ascii=False)
    print(f"✓ Raw data saved to: {RAW_OUTPUT_FILE}")
    
    # Combine with existing investors for final output
    all_companies = load_investors() + all_startups
    
    # Convert investor format to match startup format
    for company in all_companies:
        if 'portfolioUrl' in company:
            # This is an investor from seed list, normalize format
            company.setdefault('employees', 0)
            company.setdefault('funding', '')
            company.setdefault('valuation', '')
            company.setdefault('isHiring', False)
            company.setdefault('lastUpdated', datetime.now().isoformat())
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_companies, f, indent=2, ensure_ascii=False)
    print(f"✓ All companies saved to: {OUTPUT_FILE}")
    
    # Summary
    startup_count = len([c for c in all_companies if c['type'] == 'startup'])
    investor_count = len([c for c in all_companies if c['type'] == 'investor'])
    print(f"\n📊 Summary: {startup_count} startups, {investor_count} investors")
    
    return all_startups


def main():
    parser = argparse.ArgumentParser(description='Scrape Danish investor portfolios')
    parser.add_argument('--investor', help='Specific investor ID to scrape')
    parser.add_argument('--limit', type=int, help='Limit number of investors to scrape')
    args = parser.parse_args()
    
    asyncio.run(scrape_all_portfolios(investor_id=args.investor, limit=args.limit))


if __name__ == '__main__':
    main()
