"""
Data Cleanup V3 - Advanced Filtering & Legitimacy Check
=======================================================
Implements heuristic-based legitimacy checks and smarter name extraction
to fix specific scraping issues (e.g. Kompas VC) and remove noise.
"""

import json
import re
from pathlib import Path
from urllib.parse import urlparse

DATA_DIR = Path(__file__).parent.parent / "data"
INVESTORS_FILE = DATA_DIR / "investors.json"
PORTFOLIO_RAW = DATA_DIR / "portfolio_raw.json"
OUTPUT_FILE = DATA_DIR / "companies.json"

# Strict blacklist of non-company terms
BLACKLIST = {
    # Tech giants/platforms (often appear as social links)
    'twitter', 'facebook', 'linkedin', 'instagram', 'youtube', 'medium', 'substack',
    'google', 'apple', 'microsoft', 'amazon', 'netflix', 'spotify', 'salesforce',
    'hubspot', 'slack', 'notion', 'discord', 'telegram', 'whatsapp',
    'eventbrite',

    # Browsers / Tech props
    'google chrome', 'mozilla firefox', 'safari', 'microsoft edge', 'internet explorer',
    'android', 'ios', 'windows', 'macos', 'linux',
    'flash cookies', 'cookies',
    
    # Generic terms / Navigation
    'home', 'about', 'about us', 'contact', 'team', 'careers', 'jobs', 'login',
    'sign up', 'menu', 'search', 'filter', 'status', 'active', 'pending',
    'privacy policy', 'terms', 'legal', 'gdpr', 'sustainability', 'compliance',
    'read more', 'learn more', 'click here', 'view all', 'show more',
    'articles of association', 'conflict of interests policy',
    'kid fund', 'fund iv', 'fund v', 'portfolio',
    'join the mission', 'no consideration of sustainability adverse impacts',
    'sustainability-related disclosures', 'neurotorium', 'the brain prize',
    'proptech denmark', 'venture climate alliance', 'tonik',

    # Table Headers / Filters (Startup Wise Guys noise)
    'menu', 'status', 'active', 'batch', 'links', 'date', 'year of investment',
    'location', 'category', 'founder', 'industry', 'website', 'team',
    'cyber growth bilbao', 'cyber growth bilbao spring 2024',
    'exited', 'partial exit', 'dead', 'shut down', 'acquired',
    'active/partial exit', 'headquarters country', 'founding date',
    'cyber italy', 'cyber spain', 'cyber estonia',
    'funding type', 'total funding', 'verticals', 'business model',

    # Countries (prevent geographic noise)
    'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'antigua', 'argentina', 'armenia', 'australia', 'austria',
    'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan',
    'bolivia', 'bosnia', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina', 'burundi', 'cambodia', 'cameroon',
    'canada', 'cape verde', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'costa rica', 'croatia',
    'cuba', 'cyprus', 'czechia', 'denmark', 'djibouti', 'dominica', 'ecuador', 'egypt', 'el salvador', 'equatorial guinea',
    'eritrea', 'estonia', 'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia',
    'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana', 'haiti', 'honduras', 'hungary',
    'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan',
    'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon',
    'lesotho', 'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives',
    'mali', 'malta', 'marshall islands', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia',
    'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal', 'netherlands', 'new zealand', 'nicaragua',
    'niger', 'nigeria', 'north korea', 'north macedonia', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama',
    'papua new guinea', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda',
    'saint kitts', 'saint lucia', 'samoa', 'san marino', 'saudi arabia', 'senegal', 'serbia', 'seychelles', 'sierra leone', 'singapore',
    'slovakia', 'slovenia', 'solomon islands', 'somalia', 'south africa', 'south korea', 'south sudan', 'spain', 'sri lanka', 'sudan',
    'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'togo', 'tonga',
    'trinidad', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine', 'united arab emirates', 'united kingdom', 'united states',
    'uruguay', 'uzbekistan', 'vanuatu', 'vatican city', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
    'usa', 'uk', 'uae', 'north america', 'south america', 'europe', 'asia', 'africa', 'oceania', 'middle east',
    'the netherlands', 'czech republic'
}

# Regex for "Exited" prefix issue (Kompas VC)
EXITED_PATTERN = re.compile(r'^Exited', re.IGNORECASE)

def extract_name_from_url(url):
    """
    Extract a potential company name from the URL slug.
    e.g. https://kompas.vc/portfolio/array-labs -> "Array Labs"
    """
    if not url:
        return None
    
    try:
        parsed = urlparse(url)
        # Get the last non-empty path segment
        path_parts = [p for p in parsed.path.split('/') if p]
        if not path_parts:
            return None
        
        slug = path_parts[-1]
        
        # Clean slug
        name = slug.replace('-', ' ').replace('_', ' ').replace('.html', '')
        return name.title()
    except:
        return None

def is_legitimate_startup(company, investor_names):
    """
    Validation logic to determine if a scraped entry is a legitimate startup.
    Returns (bool, str_reason)
    """
    name = company.get('name', '').strip()
    website = company.get('website', '')
    name_lower = name.lower()

    # 1. Check blacklist (exact match)
    if name_lower in BLACKLIST:
        return False, "Blacklisted term"

    # 2. Check length (too short or too long)
    if len(name) < 2:
        return False, "Name too short"
    if len(name) > 50:
        return False, "Name too long (likely description)"
    
    # 3. Check for specific noise patterns
    if 'cookies' in name_lower or 'policy' in name_lower or '.pdf' in name_lower:
        return False, "Policy/Cookie/PDF noise"
    
    # 4. Check if it's just the investor's own name (self-reference)
    for inv_name in investor_names:
         # simple heuristic: if company name is very similar to investor name
         if name_lower == inv_name.lower():
             return False, "Self-reference"

    # 5. Check if website is a file (PDF)
    if website and website.lower().endswith('.pdf'):
        return False, "PDF Website"

    # 6. Check for "Read..." pattern (Copenhagen Fintech style)
    if name.startswith("Read"):
        # e.g. "ReadStartup & Scaleup..."
        # We might check if we can rescue this, but for now reject
        return False, "Starts with 'Read'"

    return True, "Valid"

def fix_kompas_name(company):
    """
    Attempt to fix broken Kompas VC names using website URL.
    """
    name = company.get('name', '')
    website = company.get('website', '')
    
    if name.lower().startswith('exited') or len(name) > 40:
        extracted = extract_name_from_url(website)
        if extracted:
            return extracted
    return name

def main():
    print("running legitimacy check...")
    
    # Load data
    with open(INVESTORS_FILE, 'r', encoding='utf-8') as f:
        investors = json.load(f)
    with open(PORTFOLIO_RAW, 'r', encoding='utf-8') as f:
        portfolios = json.load(f)

    # Load existing companies to preserve coordinates
    existing_coords = {}
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                for c in existing_data:
                    if c.get('coordinates'):
                        # Map both ID and Name to coords for better matching
                        existing_coords[c.get('id')] = c['coordinates']
                        existing_coords[c.get('name')] = c['coordinates']
        except Exception as e:
            print(f"Could not load existing coordinates: {e}")
        
    investor_names = {inv['name'] for inv in investors}
    
    valid_startups = {}
    
    for investor_id, companies in portfolios.items():
        # Find investor details
        investor_obj = next((i for i in investors if i['id'] == investor_id), None)
        investor_name = investor_obj['name'] if investor_obj else investor_id
        
        for company in companies:
            original_name = company.get('name', '').strip()
            
            # Special cleanup for specific investors
            if investor_id == 'kompas-vc':
                company['name'] = fix_kompas_name(company)
            
            # Validation match
            is_valid, reason = is_legitimate_startup(company, investor_names)
            
            if not is_valid:
                # print(f"Rejected: {original_name} ({reason})")
                continue
            
            # Create standardized ID (using old format to maximize matches)
            company_name = company['name'].strip()
            # Clean common suffixes for cleaner display
            clean_display_name = re.sub(r' (ApS|A/S|Inc\.|Ltd\.)$', '', company_name, flags=re.IGNORECASE)
            
            # ID generation: lowercase, replace spaces with hyphens, keep alnum and hyphens
            cid = clean_display_name.lower().replace(' ', '-')
            cid = "".join(c for c in cid if c.isalnum() or c == '-')
            
            if not cid:
                continue

            if cid not in valid_startups:
                # Check for existing coordinates
                coords = existing_coords.get(cid) or existing_coords.get(clean_display_name)
                
                valid_startups[cid] = {
                    "id": cid,
                    "name": clean_display_name,
                    "type": "startup",
                    "logo": company.get('logo', ''),
                    "website": company.get('website', ''),
                    "industry": "",
                    "description": company.get('description', ''),
                    "founded": None,
                    "employees": 0,
                    "location": "Denmark", # Default
                    "investors": [investor_name],
                    "coordinates": coords
                }
            else:
                # Merge investors
                if investor_name not in valid_startups[cid]['investors']:
                    valid_startups[cid]['investors'].append(investor_name)

    # Combine
    final_list = investors + list(valid_startups.values())
    
    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_list, f, indent=2)
        
    print(f"Cleaning complete. Processed {len(final_list)} valid entities (Investors + Startups).")
    print(f"Startups count: {len(valid_startups)}")

if __name__ == "__main__":
    main()
