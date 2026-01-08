"""
Enhanced Data Cleanup Script v2
===============================
Removes all non-startup entries including browsers, operating systems,
PDF documents, fund names, and navigation elements.
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INVESTORS_FILE = DATA_DIR / "investors.json"
PORTFOLIO_RAW = DATA_DIR / "portfolio_raw.json"
OUTPUT_FILE = DATA_DIR / "companies.json"

# Words/patterns that indicate non-company entries
INVALID_NAMES = {
    # Browsers
    'mozilla firefox', 'firefox', 'chrome', 'google chrome', 'safari', 'edge', 'internet explorer',
    'microsoft edge', 'opera', 'brave', 'vivaldi',
    
    # Operating systems
    'windows', 'windows 7', 'windows 10', 'windows 11', 'macos', 'mac os', 'linux',
    'android', 'ios', 'ubuntu', 'debian',
    
    # Big tech (not Danish startups)
    'microsoft', 'google', 'amazon', 'facebook', 'meta', 'apple', 'netflix',
    'spotify', 'substack', 'medium', 'twitter', 'linkedin', 'instagram', 'youtube',
    'tiktok', 'snapchat', 'whatsapp', 'telegram', 'google - privatlivspolitik',
    
    # Generic web terms
    'cookie', 'cookies', 'flash cookies', 'privacy', 'privacy policy', 'policy', 'terms',
    'terms of service', 'legal', 'gdpr', 'compliance', 'disclosure',
    'sustainability', 'sustainability-related', 'adverse impacts',
    
    # Navigation
    'home', 'about', 'about us', 'contact', 'team', 'blog', 'news', 'press',
    'careers', 'career page', 'jobs', 'login', 'sign up', 'signup', 'register', 'subscribe',
    'newsletter', 'here', 'click here', 'learn more', 'read more', 'see more',
    'view all', 'show more', 'load more', 'next', 'previous', 'back',
    'all rights reserved', 'copyright', 'menu', 'navigation', 'search', 'filter',
    
    # Geographic (not companies)
    'north america', 'europe', 'asia', 'africa', 'south america', 'australia',
    'united states', 'usa', 'uk', 'germany', 'france', 'spain', 'italy',
    'denmark', 'sweden', 'norway', 'finland', 'netherlands', 'copenhagen',
    'aarhus', 'odense', 'aalborg',
    
    # Fund/investor terms
    'kid fund', 'kid alumni', 'kid warehousing', 'kid web3', 'fund iv', 'fund v',
    'portfolio', 'companies', 'startups', 'investments', 'investors', 'founders',
    'partners', 'board', 'board compliance', 'venture climate alliance',
    
    # Status words
    'active', 'status', 'pending', 'completed', 'new', 'old', 'updated',
    
    # Other noise
    'join the mission', 'the brain prize', 'neurotorium',
    'sustainability-related disclosures', 'no consideration of sustainability',
    'proptech denmark', 'tonik',
}

# Additional patterns (regex)
INVALID_PATTERNS = [
    r'\.pdf$',           # PDF links
    r'^kid\s',           # KID fund docs
    r'^fund\s[ivx]+$',   # Fund names
    r'^series\s[abc]$',  # Funding rounds
    r'^windows\s\d+$',   # Windows versions
    r'^macos\s',         # macOS versions
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INVALID_PATTERNS]


def is_pdf_link(url):
    """Check if URL is a PDF."""
    return url and '.pdf' in url.lower()


def is_valid_startup(name, website=''):
    """Check if a name represents a valid startup."""
    name_lower = name.lower().strip()
    
    # Check exact matches
    if name_lower in INVALID_NAMES:
        return False
    
    # Check patterns
    for pattern in COMPILED_PATTERNS:
        if pattern.search(name_lower):
            return False
    
    # Check PDF website
    if is_pdf_link(website):
        return False
    
    # Too short
    if len(name_lower) < 3:
        return False
    
    # Too long (probably a sentence)
    if len(name.split()) > 5:
        return False
    
    # Has special characters
    if any(c in name for c in [':', ';', '|', '/', '\\', '(', ')']):
        return False
    
    # Mostly numbers
    if sum(c.isdigit() for c in name) > len(name) / 2:
        return False
    
    return True


def clean_name(name):
    """Clean and normalize a company name."""
    name = name.strip()
    if name.isupper() or name.islower():
        name = name.title()
    return name


def main():
    print("=" * 60)
    print("Data Cleanup v2 - Fresh Start from Portfolio Data")
    print("=" * 60)
    
    # Load investor seed data
    with open(INVESTORS_FILE, 'r', encoding='utf-8') as f:
        investors = json.load(f)
    print(f"Loaded {len(investors)} investors from seed list")
    
    # Load raw portfolio data
    try:
        with open(PORTFOLIO_RAW, 'r', encoding='utf-8') as f:
            portfolio_raw = json.load(f)
        print(f"Loaded portfolio data from {len(portfolio_raw)} investors")
    except FileNotFoundError:
        print("No portfolio_raw.json found, using empty")
        portfolio_raw = {}
    
    # Process portfolios to extract startups
    all_startups = {}
    removed = []
    
    for investor_id, companies in portfolio_raw.items():
        investor_name = next(
            (inv['name'] for inv in investors if inv['id'] == investor_id),
            investor_id
        )
        
        for company in companies:
            name = company.get('name', '').strip()
            website = company.get('website', '')
            
            if not is_valid_startup(name, website):
                removed.append(name)
                continue
            
            # Create ID
            company_id = name.lower().replace(' ', '-')
            company_id = ''.join(c for c in company_id if c.isalnum() or c == '-')
            
            if not company_id or len(company_id) < 2:
                continue
            
            # Merge with existing or create new
            if company_id in all_startups:
                if investor_name not in all_startups[company_id].get('investors', []):
                    all_startups[company_id].setdefault('investors', []).append(investor_name)
            else:
                all_startups[company_id] = {
                    'id': company_id,
                    'name': clean_name(name),
                    'type': 'startup',
                    'logo': company.get('logo', ''),
                    'website': website,
                    'industry': '',
                    'description': company.get('description', ''),
                    'employees': 0,
                    'founded': None,
                    'location': 'Denmark',
                    'funding': '',
                    'valuation': '',
                    'coordinates': None,
                    'isHiring': False,
                    'investors': [investor_name],
                    'source': f"Portfolio of {investor_name}",
                }
    
    startups = list(all_startups.values())
    
    print(f"\n✓ Valid startups: {len(startups)}")
    print(f"✗ Removed entries: {len(removed)}")
    
    # Show removed examples
    unique_removed = list(set(removed))[:20]
    print(f"\nRemoved examples:")
    for name in unique_removed:
        print(f"  ✗ {name}")
    
    # Combine investors and startups
    all_companies = investors + startups
    
    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_companies, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved {len(all_companies)} companies to {OUTPUT_FILE}")
    print(f"📊 Final: {len(startups)} startups, {len(investors)} investors")
    
    # Show sample startups
    print(f"\nSample valid startups:")
    for startup in startups[:10]:
        inv = ', '.join(startup.get('investors', [])[:2])
        print(f"  ✓ {startup['name']}" + (f" (backed by {inv})" if inv else ""))


if __name__ == '__main__':
    main()
