"""
Geocoding Script for Denmark Ecosystem
======================================
Uses OpenStreetMap Nominatim to convert location names to coordinates.
Respects rate limits (1 request per second for Nominatim).

Usage:
    python geocode.py                 # Geocode all companies without coordinates
    python geocode.py --all           # Re-geocode all companies
    python geocode.py --limit 50      # Limit to 50 companies
"""

import json
import time
import argparse
import random
from pathlib import Path
from urllib.parse import quote
import urllib.request

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "companies.json"

# Nominatim endpoint
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Danish cities with default coordinates (fallback)
DANISH_CITIES = {
    "copenhagen": [55.6761, 12.5683],
    "københavn": [55.6761, 12.5683],
    "aarhus": [56.1629, 10.2039],
    "århus": [56.1629, 10.2039],
    "odense": [55.4038, 10.4024],
    "aalborg": [57.0488, 9.9217],
    "esbjerg": [55.4667, 8.4500],
    "randers": [56.4607, 10.0364],
    "kolding": [55.4904, 9.4721],
    "horsens": [55.8607, 9.8500],
    "vejle": [55.7113, 9.5364],
    "roskilde": [55.6419, 12.0878],
    "herning": [56.1393, 8.9764],
    "silkeborg": [56.1693, 9.5451],
    "næstved": [55.2297, 11.7600],
    "fredericia": [55.5657, 9.7529],
    "viborg": [56.4532, 9.4020],
    "køge": [55.4578, 12.1822],
    "holstebro": [56.3607, 8.6167],
    "taastrup": [55.6517, 12.2917],
    "slagelse": [55.4028, 11.3542],
    "helsingør": [56.0361, 12.6136],
    "hillerød": [55.9297, 12.3108],
    "sønderborg": [54.9136, 9.7921],
    "hellerup": [55.7314, 12.5734],
    "gentofte": [55.7500, 12.5500],
    "lyngby": [55.7706, 12.5039],
    "frederiksberg": [55.6800, 12.5300],
    "søborg": [55.7333, 12.5167],
    "sorø": [55.4319, 11.5553],
    "grenaa": [56.4154, 10.8833],
    "denmark": [55.6761, 12.5683],  # Default to Copenhagen
}


def geocode_location(location, country="Denmark"):
    """Geocode a location string using Nominatim."""
    if not location:
        return None
    
    # Clean location string
    location = location.strip()
    
    # Check if it's a known Danish city
    location_lower = location.lower().split(',')[0].strip()
    if location_lower in DANISH_CITIES:
        return DANISH_CITIES[location_lower]
    
    # Try Nominatim
    try:
        query = f"{location}, {country}"
        url = f"{NOMINATIM_URL}?q={quote(query)}&format=json&limit=1"
        
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'DenmarkEcosystemMap/1.0 (ecosystem-map-project)'
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return [lat, lon]
    
    except Exception as e:
        print(f"    ⚠ Geocoding error: {e}")
    
    return None


def add_random_offset(coords, offset_range=0.02):
    """Add small random offset to avoid marker overlapping."""
    if not coords:
        return coords
    
    lat_offset = random.uniform(-offset_range, offset_range)
    lon_offset = random.uniform(-offset_range, offset_range)
    
    return [coords[0] + lat_offset, coords[1] + lon_offset]


def main():
    parser = argparse.ArgumentParser(description='Geocode companies')
    parser.add_argument('--all', action='store_true', help='Re-geocode all companies')
    parser.add_argument('--limit', type=int, help='Limit number of companies to geocode')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Geocoding Denmark Ecosystem Companies")
    print("=" * 60)
    
    # Load data
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)
    
    print(f"Loaded {len(companies)} companies")
    
    # Filter companies to geocode
    if args.all:
        to_geocode = companies
    else:
        to_geocode = [c for c in companies if not c.get('coordinates')]
    
    if args.limit:
        to_geocode = to_geocode[:args.limit]
    
    print(f"Companies to geocode: {len(to_geocode)}")
    
    if not to_geocode:
        print("No companies need geocoding!")
        return
    
    # Geocode each company
    success = 0
    failed = 0
    
    for i, company in enumerate(to_geocode, 1):
        name = company.get('name', 'Unknown')
        location = company.get('location', '')
        
        print(f"\n[{i}/{len(to_geocode)}] {name}")
        print(f"  Location: {location or 'Denmark'}")
        
        # Try to geocode
        coords = geocode_location(location or 'Denmark')
        
        if coords:
            # Add small random offset to prevent overlapping
            coords = add_random_offset(coords, 0.01)
            company['coordinates'] = coords
            print(f"  ✓ Coordinates: {coords[0]:.4f}, {coords[1]:.4f}")
            success += 1
        else:
            # Fallback to Copenhagen with offset
            fallback = add_random_offset(DANISH_CITIES['copenhagen'], 0.03)
            company['coordinates'] = fallback
            print(f"  ⚠ Fallback to Copenhagen area: {fallback[0]:.4f}, {fallback[1]:.4f}")
            failed += 1
        
        # Rate limit - Nominatim requires 1 second between requests
        time.sleep(1.1)
    
    # Save updated data
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(companies, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'=' * 60}")
    print(f"✓ Geocoding complete!")
    print(f"  Successful: {success}")
    print(f"  Fallback: {failed}")
    print(f"✓ Saved to: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
