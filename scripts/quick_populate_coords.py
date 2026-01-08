"""
Quick Populate Coordinates
==========================
Instantly assigns approximate coordinates to companies based on their location string
(City/Zipcode) without querying external APIs. This is for development visualization.
"""

import json
import random
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "companies.json"

# Approx coordinates for Danish cities/zipcodes
LOCATION_MAP = {
    # Greater Copenhagen
    "copenhagen": [55.6761, 12.5683],
    "københavn": [55.6761, 12.5683],
    "frederiksberg": [55.6800, 12.5300],
    "valby": [55.6600, 12.5000],
    "vanløse": [55.6800, 12.4800],
    "østerbro": [55.7000, 12.5800],
    "nørrebro": [55.6900, 12.5500],
    "vesterbro": [55.6650, 12.5500],
    "hellerup": [55.7314, 12.5734],
    "gentofte": [55.7500, 12.5500],
    "lyngby": [55.7706, 12.5039],
    "søborg": [55.7333, 12.5167],
    "glostrup": [55.6667, 12.4000],
    "herlev": [55.7333, 12.4333],
    "hvidovre": [55.6500, 12.4667],
    "rødovre": [55.6833, 12.4667],
    "kastrup": [55.6333, 12.6500],
    "dragør": [55.5900, 12.6700],
    "ballerup": [55.7333, 12.3667],
    "bagsværd": [55.7667, 12.4500],
    
    # Major Cities
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
    "sønderborg": [54.9136, 9.7921],
    "slagelse": [55.4028, 11.3542],
    "hillerød": [55.9297, 12.3108],
    "helsingør": [56.0361, 12.6136],
    
    # Zipcodes (incomplete but helpful)
    "1000": [55.6761, 12.5683], # Kbh K
    "2100": [55.7000, 12.5800], # Ø
    "2200": [55.6900, 12.5500], # N
    "2300": [55.6600, 12.6000], # S
    "2400": [55.7000, 12.5333], # NV
    "2500": [55.6600, 12.5000], # Valby
    "2900": [55.7314, 12.5734], # Hellerup
    "8000": [56.1629, 10.2039], # Aarhus C
    "8200": [56.1800, 10.2000], # Aarhus N
    "5000": [55.4038, 10.4024], # Odense C
    "9000": [57.0488, 9.9217], # Aalborg
}

def get_approx_coords(location_str):
    if not location_str:
        return None
    
    s = location_str.lower()
    
    # Check for direct city matches
    for city, coords in LOCATION_MAP.items():
        if city in s:
            return coords
            
    # Check for zipcodes
    # Looking for a 4 digit number
    zip_match = re.search(r'\b\d{4}\b', s)
    if zip_match:
        zipcode = zip_match.group(0)
        # Try exact map
        if zipcode in LOCATION_MAP:
            return LOCATION_MAP[zipcode]
            
        # Heuristic for unknown zipcodes
        z = int(zipcode)
        if 1000 <= z < 3000: # Greater Copenhagen
            return LOCATION_MAP["copenhagen"]
        elif 8000 <= z < 8300: # Aarhus area
            return LOCATION_MAP["aarhus"]
        elif 5000 <= z < 5300: # Odense area
            return LOCATION_MAP["odense"]
        elif 9000 <= z < 9300: # Aalborg area
            return LOCATION_MAP["aalborg"]
            
    # Default to "Denmark" center if we can't find anything but it has "Denmark" in it
    if "denmark" in s:
        # Heavily weighted towards Copenhagen because that's where most startups are
        if random.random() > 0.3:
            return LOCATION_MAP["copenhagen"]
        return [56.0, 10.0] # Middle of Jutland approx
        
    return None

def add_jitter(coords, radius=0.03):
    if not coords:
        return None
    lat = coords[0] + random.uniform(-radius, radius)
    lon = coords[1] + random.uniform(-radius, radius)
    return [lat, lon]

def main():
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)
        
    updated_count = 0
    
    for c in companies:
        if not c.get('coordinates'):
            location = c.get('location', '')
            base_coords = get_approx_coords(location)
            
            if base_coords:
                c['coordinates'] = add_jitter(base_coords)
                updated_count += 1
            else:
                # Still give it a random coordinate in Copenhagen if absolutely nothing found
                # just so it shows up for the UI demo
                c['coordinates'] = add_jitter(LOCATION_MAP["copenhagen"], 0.05)
                updated_count += 1
                
    print(f"Updated {updated_count} companies with approx coordinates.")
    
    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(companies, f, indent=2, ensure_ascii=False)
        
    print("Done! Refresh the browser.")

if __name__ == "__main__":
    main()
