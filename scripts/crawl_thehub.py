"""
The Hub Crawler
===============
Crawls thehub.io API to fetch Danish startups.
MIGRATION SCRIPT: Replaces data/companies.json with high-quality data.
"""

import json
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "companies.json"

API_URL = "https://thehub.io/api/companiesProper"
IMG_BASE_URL = "https://thehub-io.imgix.net"

def fetch_page(page):
    params = [
        ('countryCodes[]', 'DK'),
        ('page', str(page)),
        ('per_page', '100') # Try to boost per_page ? Default is 15. The Hub might ignore it.
    ]
    # 'countryCodes[]' key implies multiple values potentially, urllib handles list if passed correctly?
    # urllib.parse.urlencode uses doseq=True for lists.
    
    query_string = urllib.parse.urlencode(params)
    url = f"{API_URL}?{query_string}"
    
    # User Agent is important for crawling
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching page {page}: {e}")
        return None

def process_company(doc):
    """Convert The Hub format to our format."""
    name = doc.get('name')
    if not name: return None
    
    # ID creation
    cid = "".join(c for c in name.lower() if c.isalnum() or c == '-').replace(' ', '-')
    
    # Extract location and coordinates
    location_str = "Denmark"
    coordinates = None
    
    countries = doc.get('countries', [])
    if countries:
        # Prioritize first country (usually HQ)
        loc_data = countries[0].get('location', {})
        location_str = loc_data.get('city') or loc_data.get('address') or "Denmark"
        
        # Coordinates: The Hub gives [lat, lng] or object?
        # Usually it's {lat: ..., lng: ...} or [lng, lat] (GeoJSON).
        # Need to verify. Assuming generic object for now, will inspect later.
        # Browser subagent said "location.coordinates".
        # If missing, it's None.
        coords = loc_data.get('coordinates')
        if coords:
            # Check format. If list [lng, lat] (GeoJSON) or [lat, lng].
            # Inspecting common Leaflet usage: usually [lat, lng].
            # If dict {lat, lng}:
            if isinstance(coords, dict):
                coordinates = [coords.get('lat'), coords.get('lng')]
            elif isinstance(coords, list):
                # Standard GeoJSON is [lng, lat]. Leaflet matches [lat, lng].
                # We'll assume list is [lat, lng] if not specified, 
                # but valid coordinates for Denmark are Lat ~55, Lng ~12.
                # If coords[0] > 20, it's Lat. If coords[0] < 20, it's Lng.
                lat, lng = coords[0], coords[1]
                if lat < 20: # Likely Lng
                    coordinates = [lng, lat]
                else:
                    coordinates = [lat, lng]
    
    # Logo
    logo = ""
    logo_img = doc.get('logoImage')
    if logo_img and logo_img.get('path'):
        logo = f"{IMG_BASE_URL}{logo_img.get('path')}"
        
    return {
        "id": cid,
        "name": name,
        "type": "startup", # The Hub is mostly startups
        "website": doc.get('website') or "",
        "description": doc.get('whatWeDo') or "",
        "logo": logo,
        "location": location_str,
        "coordinates": coordinates,
        "founded": doc.get('foundedDate'), # Format? Likely YYYY or ISO
        "employees": doc.get('employees'), # String count
        "industries": [i.get('name') if isinstance(i, dict) else i for i in doc.get('industries', [])],
        "cvr": doc.get('registrationNumber'),
        "verified": bool(doc.get('registrationNumber')), # Assume CVR presence = verified
        "source": "thehub"
    }

def main():
    print("Starting The Hub Crawler...")
    
    all_companies = []
    page = 1
    
    while True:
        print(f"Fetching page {page}...")
        data = fetch_page(page)
        
        if not data:
            break
            
        docs = data.get('docs', [])
        if not docs:
            print("No more companies found.")
            break
            
        print(f"  Found {len(docs)} companies.")
        
        for doc in docs:
            processed = process_company(doc)
            if processed:
                all_companies.append(processed)
        
        # Save incrementally
        if page % 5 == 0:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(all_companies, f, indent=2)
                
        # Pagination check
        total_pages = data.get('pages', 0)
        if page >= total_pages:
            print("Reached last page.")
            break
            
        page += 1
        time.sleep(1.0) # Rate limit
        
    # Final save
    print(f"Crawling complete. Total companies: {len(all_companies)}")
    
    # Filter out companies without coordinates? 
    # Or keep them and warn.
    # The Hub usually has good geo data.
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_companies, f, indent=2)

if __name__ == "__main__":
    main()
