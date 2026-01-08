"""
Dealroom Denmark Startup Crawler
================================
Crawls Dealroom.co for Danish startups and investors using Playwright
to handle Cloudflare protection and dynamic content loading.

IMPORTANT: Without a Dealroom account, only ~6 companies are visible.
For full access (15,000+ companies), use --login flag to log in first.

Usage:
    python crawler.py                    # Crawl visible companies (limited without login)
    python crawler.py --login            # Interactive login first (RECOMMENDED)
    python crawler.py --limit 100        # Limit to 100 companies
    python crawler.py --type startup     # Only startups
    python crawler.py --type investor    # Only investors
"""

import asyncio
import json
import argparse
from datetime import datetime
from pathlib import Path

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")
    exit(1)


# Output paths
OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "companies.json"
RAW_OUTPUT_FILE = OUTPUT_DIR / "dealroom_raw.json"

# Dealroom URLs
BASE_URL = "https://app.dealroom.co"
DENMARK_STARTUPS_URL = f"{BASE_URL}/companies.startups/f/locations/anyof_Denmark"
DENMARK_INVESTORS_URL = f"{BASE_URL}/investors/f/locations/anyof_Denmark"


async def wait_for_cloudflare(page, timeout=30000):
    """Wait for Cloudflare challenge to complete."""
    try:
        await page.wait_for_function(
            """() => {
                return !document.body.innerText.includes('Verify you are human') &&
                       !document.body.innerText.includes('Just a moment');
            }""",
            timeout=timeout
        )
        print("✓ Cloudflare challenge passed")
        return True
    except PlaywrightTimeout:
        print("✗ Cloudflare challenge timeout")
        return False


async def interactive_login(page):
    """Wait for user to log in manually."""
    print("\n" + "=" * 60)
    print("MANUAL LOGIN REQUIRED")
    print("=" * 60)
    print("A browser window will open. Please:")
    print("  1. Log in to your Dealroom account")
    print("  2. Once logged in, come back here and press Enter")
    print("=" * 60)
    
    # Navigate to login page
    await page.goto(f"{BASE_URL}/users/login", wait_until="networkidle")
    await wait_for_cloudflare(page)
    
    # Wait for user input
    input("\n>>> Press Enter after logging in...")
    
    # Verify login by checking if we can see more than 6 results
    await page.goto(DENMARK_STARTUPS_URL, wait_until="networkidle")
    await asyncio.sleep(3)
    
    company_count = await page.evaluate("""
        () => document.querySelectorAll('a[href*="/companies/"]').length
    """)
    
    if company_count > 10:
        print(f"✓ Login successful! Can see {company_count} companies")
        return True
    else:
        print(f"⚠ Only seeing {company_count} companies. Login may not have worked.")
        return False


async def scroll_to_load_all(page, max_scrolls=100, max_companies=1000):
    """Scroll down to load all lazy-loaded content."""
    previous_count = 0
    scroll_count = 0
    no_change_count = 0
    
    while scroll_count < max_scrolls:
        # Count current companies
        current_count = await page.evaluate("""
            () => document.querySelectorAll('a[href*="/companies/"]').length
        """)
        
        if current_count >= max_companies:
            print(f"  Reached limit of {max_companies} companies")
            break
            
        if current_count == previous_count:
            no_change_count += 1
            if no_change_count >= 3:
                # Check for "Login to view more" button
                login_required = await page.evaluate("""
                    () => document.body.innerText.includes('Login to view more')
                """)
                if login_required:
                    print(f"  ⚠ Login required to see more than {current_count} companies")
                break
        else:
            no_change_count = 0
        
        # Scroll down
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1.5)
        
        previous_count = current_count
        scroll_count += 1
        
        if scroll_count % 5 == 0:
            print(f"  Scrolling... ({scroll_count}) - Found {current_count} companies")
    
    final_count = await page.evaluate("""
        () => document.querySelectorAll('a[href*="/companies/"]').length
    """)
    print(f"✓ Loaded {final_count} companies after {scroll_count} scrolls")
    return final_count


async def extract_companies_from_page(page):
    """Extract company data from the current page."""
    companies = await page.evaluate("""
        () => {
            const companies = [];
            const rows = document.querySelectorAll('.table-list-item');
            
            rows.forEach(row => {
                try {
                    // Company name and link - look for anchor with /companies/
                    const nameLink = row.querySelector('a[href*="/companies/"]');
                    if (!nameLink) return;
                    
                    const name = nameLink.textContent?.trim();
                    const href = nameLink.getAttribute('href');
                    const slug = href?.replace('/companies/', '').split('?')[0];
                    
                    // Get title attribute which often contains description
                    const titleDiv = row.querySelector('[title]');
                    const titleText = titleDiv?.getAttribute('title') || '';
                    
                    // Extract description from title (format: "Name: Description...")
                    let description = '';
                    if (titleText.includes(':')) {
                        description = titleText.split(':').slice(1).join(':').trim();
                    }
                    
                    // Logo - look for img in the name column
                    const logoImg = row.querySelector('.table-list-column.name img');
                    const logo = logoImg?.src || '';
                    
                    // Get all column values as a key-value map
                    const columns = {};
                    const columnDivs = row.querySelectorAll('.table-list-column');
                    columnDivs.forEach(col => {
                        // Get column type from class name
                        const classes = Array.from(col.classList);
                        const typeClass = classes.find(c => c !== 'table-list-column');
                        if (typeClass) {
                            columns[typeClass] = col.textContent?.trim();
                        }
                    });
                    
                    if (name && slug) {
                        companies.push({
                            name,
                            slug,
                            logo,
                            description,
                            market: columns.companyMarket || '',
                            businessType: columns.type || '',
                            launchDate: columns.launchDate || '',
                            hqLocation: columns.hqLocations || '',
                            totalFunding: columns.totalFunding || '',
                            valuation: columns.valuation || '',
                            employees: columns.employeesLatest || '',
                            growth: columns.growth_percentage_employees_12m || '',
                            signal: columns.startupRankingRating || '',
                            dealroomUrl: 'https://app.dealroom.co' + href
                        });
                    }
                } catch (e) {
                    console.error('Error parsing row:', e);
                }
            });
            
            return companies;
        }
    """)
    
    return companies


def format_for_ecosystem_map(raw_companies):
    """Format raw Dealroom data into the ecosystem map schema."""
    formatted = []
    seen_ids = set()
    
    for company in raw_companies:
        # Create unique ID
        company_id = (company.get('slug', '') or company.get('name', '')).lower().replace(' ', '-')
        if company_id in seen_ids:
            continue
        seen_ids.add(company_id)
        
        # Parse employees
        employees = 0
        emp_str = company.get('employees', '')
        if emp_str:
            try:
                emp_str = emp_str.replace(',', '').replace('+', '').replace('~', '')
                if '-' in emp_str:
                    employees = int(emp_str.split('-')[1])
                else:
                    digits = ''.join(filter(str.isdigit, emp_str))
                    employees = int(digits) if digits else 0
            except:
                pass
        
        # Parse founded year from launch date
        founded = None
        launch_str = company.get('launchDate', '')
        if launch_str:
            try:
                digits = ''.join(filter(str.isdigit, launch_str))
                if len(digits) >= 4:
                    founded = int(digits[:4])
            except:
                pass
        
        # Determine type (startup vs investor)
        company_type = 'startup'
        market = (company.get('market', '') or '').lower()
        business_type = (company.get('businessType', '') or '').lower()
        if any(term in market + business_type for term in ['venture', 'capital', 'investment', 'investor', 'vc', 'fund', 'private equity']):
            company_type = 'investor'
        
        # Get primary industry from market
        industry = company.get('market', '').split(',')[0].strip() if company.get('market') else ''
        
        formatted.append({
            'id': company_id,
            'name': company.get('name', ''),
            'type': company_type,
            'logo': company.get('logo', ''),
            'website': '',  # Would need detail page fetch
            'industry': industry,
            'description': company.get('description', ''),
            'employees': employees,
            'founded': founded,
            'location': company.get('hqLocation', ''),
            'funding': company.get('totalFunding', ''),
            'valuation': company.get('valuation', ''),
            'signal': company.get('signal', ''),
            'dealroomUrl': company.get('dealroomUrl', ''),
            'coordinates': None,  # To be geocoded later
            'isHiring': False,    # To be enriched later
            'enriched': None,     # CVR data goes here
            'lastUpdated': datetime.now().isoformat()
        })
    
    return formatted


async def crawl_dealroom(limit=None, company_type=None, do_login=False):
    """Main crawler function."""
    print("=" * 60)
    print("Dealroom Denmark Startup Crawler")
    print("=" * 60)
    
    if not do_login:
        print("\n⚠ Running without login - only ~6 companies visible!")
        print("  Use --login flag to access full dataset (15,000+ companies)")
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(
            headless=False,  # Must be False for manual login and to handle Cloudflare
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        # Stealth mode
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """)
        
        page = await context.new_page()
        all_companies = []
        
        # Interactive login if requested
        if do_login:
            await interactive_login(page)
        
        # Crawl startups
        if company_type is None or company_type == 'startup':
            print("\n[1/2] Crawling Danish startups...")
            print(f"  URL: {DENMARK_STARTUPS_URL}")
            
            try:
                await page.goto(DENMARK_STARTUPS_URL, wait_until="domcontentloaded", timeout=60000)
                
                if await wait_for_cloudflare(page):
                    # Wait for content to load
                    await asyncio.sleep(3)
                    await scroll_to_load_all(page, max_companies=limit or 1000)
                    
                    startups = await extract_companies_from_page(page)
                    print(f"  ✓ Extracted {len(startups)} startups")
                    all_companies.extend(startups)
                    
            except Exception as e:
                print(f"  ✗ Error crawling startups: {e}")
        
        # Crawl investors
        if company_type is None or company_type == 'investor':
            print("\n[2/2] Crawling Danish investors...")
            print(f"  URL: {DENMARK_INVESTORS_URL}")
            
            try:
                await page.goto(DENMARK_INVESTORS_URL, wait_until="domcontentloaded", timeout=60000)
                
                if await wait_for_cloudflare(page):
                    await asyncio.sleep(3)
                    await scroll_to_load_all(page, max_companies=limit or 500)
                    
                    investors = await extract_companies_from_page(page)
                    for inv in investors:
                        inv['type'] = 'investor'
                    print(f"  ✓ Extracted {len(investors)} investors")
                    all_companies.extend(investors)
                    
            except Exception as e:
                print(f"  ✗ Error crawling investors: {e}")
        
        await browser.close()
    
    # Apply limit
    if limit and len(all_companies) > limit:
        all_companies = all_companies[:limit]
    
    # Results
    print(f"\n{'=' * 60}")
    print(f"✓ Total companies extracted: {len(all_companies)}")
    
    if len(all_companies) == 0:
        print("\n⚠ No companies extracted. Try using --login flag.")
        return []
    
    # Save raw data
    with open(RAW_OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_companies, f, indent=2, ensure_ascii=False)
    print(f"✓ Raw data saved to: {RAW_OUTPUT_FILE}")
    
    # Format for ecosystem map
    formatted = format_for_ecosystem_map(all_companies)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(formatted, f, indent=2, ensure_ascii=False)
    print(f"✓ Formatted data saved to: {OUTPUT_FILE}")
    
    # Print sample
    print(f"\n📋 Sample companies:")
    for company in formatted[:3]:
        print(f"   • {company['name']} ({company['type']}) - {company['industry']}")
    
    return formatted


def main():
    parser = argparse.ArgumentParser(
        description='Crawl Dealroom for Danish startups and investors',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python crawler.py --login              # Log in and crawl all companies
  python crawler.py --login --limit 100  # Log in and crawl 100 companies
  python crawler.py --type startup       # Only crawl startups
        """
    )
    parser.add_argument('--limit', type=int, help='Maximum number of companies to crawl')
    parser.add_argument('--type', choices=['startup', 'investor'], help='Filter by company type')
    parser.add_argument('--login', action='store_true', help='Interactive login for full access (recommended)')
    args = parser.parse_args()
    
    asyncio.run(crawl_dealroom(limit=args.limit, company_type=args.type, do_login=args.login))


if __name__ == '__main__':
    main()
