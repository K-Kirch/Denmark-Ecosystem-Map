"""
CVR Validation Script
=====================
Validates companies against the Danish Business Register (CVR) using cvrapi.dk.
Enriches data with official address, status, and employee counts.
"""

import json
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from difflib import SequenceMatcher

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "companies.json"

# CVRAPI.dk endpoint
CVR_API_URL = "https://cvrapi.dk/api"
USER_AGENT = "DenmarkEcosystemMap/1.0 (Education Project)"

def similarity(a, b):
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def search_cvr(query):
    """
    Search CVRAPI for a company name.
    """
    params = {
        'search': query,
        'country': 'dk',
        'format': 'json'
    }
    url = f"{CVR_API_URL}?{urllib.parse.urlencode(params)}"
    
    req = urllib.request.Request(
        url,
        headers={'User-Agent': USER_AGENT}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None # Not found
        print(f"Error {e.code}: {e.reason}")
        return None
    except Exception as e:
        print(f"Request error: {e}")
        return None

def main():
    print("Loading companies...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)
    
    startups = [c for c in companies if c.get('type') == 'startup']
    print(f"Found {len(startups)} startups to validate.")
    
    validated_count = 0
    enriched_count = 0
    not_found_count = 0
    
    # Cache for repeated searches (same company might appear if we reload)
    # But here we process the list once.
    
    for i, company in enumerate(startups, 1):
        name = company['name']
        original_cvr = company.get('cvr')
        
        # Skip if already verified (custom flag)
        if company.get('verified'):
            continue
            
        print(f"\nChecking [{i}/{len(startups)}]: {name}")
        
        # Clean name for search (remove legal forms which might confuse vague searches, 
        # actually CVR handles them well, but sometimes cleaner is better)
        search_name = name
        
        result = search_cvr(search_name)
        
        # CVRAPI returns a single object if definite match, or list if ambiguous?
        # Actually standard CVRAPI returns the first match object or error.
        # It's a simple search.

        if result and 'name' in result:
            cvr_name = result.get('name')
            cvr_number = result.get('vat')
            status = result.get('status', 'Normal') # 'Normal', 'Opløst' (Dissolved), 'Konkurs' (Bankrupt)
            
            # Match score
            score = similarity(name, cvr_name)
            print(f"  -> Found: {cvr_name} (CVR: {cvr_number}) [Score: {score:.2f}]")
            
            if score > 0.6 or name.lower() in cvr_name.lower():
                # Accept match
                company['cvr'] = cvr_number
                company['verified'] = True
                company['official_name'] = cvr_name
                company['status_cvr'] = status
                
                # Enrich address
                # Result has address, city, zip
                address = result.get('address')
                city = result.get('city')
                zipcode = result.get('zipcode')
                
                if city and city != company.get('location'):
                    company['location'] = city
                    company['address'] = f"{address}, {zipcode} {city}"
                    # If we change location, we might want to re-geocode? 
                    # For now, let's keep the coordinates we have unless they are null.
                    # But address is better for geocoding.
                
                # Enrich employees
                employees = result.get('employees')
                if employees:
                    company['employees_cvr'] = employees
                
                # Check status
                if status != 'Normal':
                    print(f"  WARNING: Company status is '{status}'")
                    # We might want to filter out dissolved companies
                    if status in ['Opløst', 'Tvangsopløst', 'Konkurs']:
                        company['active'] = False
                    else:
                        company['active'] = True
                else:
                    company['active'] = True

                enriched_count += 1
            else:
                print(f"  -> Low match score. Ignoring.")
                not_found_count += 1
        else:
            print("  -> Not found")
            not_found_count += 1
            
        # Rate limit (be nice)
        time.sleep(0.5)
        
        # Incremental save every 10
        if i % 10 == 0:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(companies, f, indent=2)

    # Final save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(companies, f, indent=2)
        
    print("\nValidation Complete:")
    print(f"  Enriched: {enriched_count}")
    print(f"  Not Found/Ambiguous: {not_found_count}")

if __name__ == "__main__":
    main()
