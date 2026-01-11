import json
import time
import urllib.request
from urllib.parse import quote
from pathlib import Path

# Config
DATA_DIR = Path(__file__).parent.parent / "data"
INVESTORS_FILE = DATA_DIR / "investors.json"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = 'DenmarkEcosystemMap/1.0 (investor-update)'

# Verified Addresses Dictionary
# ID -> Precise Address
ADDRESS_UPDATES = {
    "preseed-ventures": "Diplomvej 381, 2800 Kongens Lyngby, Denmark",
    "seed-capital": "Højbro Plads 10, 1200 København K, Denmark",
    "byfounders": "Kanonbådsvej 2, 1437 København K, Denmark",
    "eifo": "Haifagade 3, 2150 Nordhavn, Denmark",
    "novo-holdings": "Tuborg Havnevej 19, 2900 Hellerup, Denmark",
    "heartcore-capital": "Frederiksgade 7, 1265 København K, Denmark",
    "accelerace": "Fruebjergvej 3, 2100 København Ø, Denmark",
    "lundbeckfonden-ventures": "Scherfigsvej 7, 2100 København Ø, Denmark",
    "2150": "Southamptongade 4, 2150 Nordhavn, Denmark",
    "nordic-eye": "Havnegade 55, 1058 København K, Denmark",
    "dreamcraft-ventures": "Sankt Annæ Plads 28, 1250 København, Denmark",
    "kompas-vc": "Breeltevej 18, 2970 Hørsholm, Denmark",
    "scale-capital": "Amerika Plads 26, 2100 København Ø, Denmark",
    "climentum-capital": "Højbro Plads 10, 1200 København K, Denmark",
    "unconventional-ventures": "Luganovej 20, 2300 København, Denmark",
    "sunstone": "Nordre Fasanvej 215, 2000 Frederiksberg, Denmark",
    "people-ventures": "Frederiksborgade 11, 1360 København, Denmark",
    "futurebox": "Elektrovej 331, 2800 Kongens Lyngby, Denmark",
    "rainmaking": "Danneskiold-Samsøes Allé 41, 1434 København, Denmark",
    "cse-incubator": "Porcelænshaven 26, 2000 Frederiksberg, Denmark",
    "scion-dtu": "Venlighedsvej 10, 2970 Hørsholm, Denmark",
    "bioinnovation-institute": "Ole Maaløes Vej 3, 2200 København N, Denmark",
    "copenhagen-fintech": "Applebys Plads 7, 1411 København K, Denmark",
    "startup-wise-guys": "Hovmarksvej 78, 2920 Charlottenlund, Denmark",
    "incuba": "Åbogade 15, 8200 Aarhus N, Denmark",
    "scale-incubator": "Nålemagervej 1, 9000 Aalborg, Denmark",
    "odense-robotics": "Munkebjergvænget 1, 5230 Odense M, Denmark",
    "game-hub-denmark": "N.P. Josiassens Vej 44a, 8500 Grenå, Denmark",
    "danish-design-center": "Bryghuspladsen 8, 1473 København, Denmark",
    "nordic-alpha-partners": "Strandvejen 114A, 2900 Hellerup, Denmark",
    "go-grow": "Porcelænshaven 26, 2000 Frederiksberg, Denmark", # Same as CSE/CBS
}

def geocode(location):
    try:
        url = f"{NOMINATIM_URL}?q={quote(location)}&format=json&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            if data:
                return [float(data[0]['lat']), float(data[0]['lon'])]
    except Exception as e:
        print(f"Error geocoding {location}: {e}")
    return None

def main():
    print("Loading investors.json...")
    with open(INVESTORS_FILE, 'r', encoding='utf-8') as f:
        investors = json.load(f)

    updated_count = 0
    
    for inv in investors:
        inv_id = inv.get('id')
        if inv_id in ADDRESS_UPDATES:
            new_address = ADDRESS_UPDATES[inv_id]
            current_address = inv.get('location')
            
            # Update address if different
            if new_address != current_address:
                print(f"Updating {inv['name']}:")
                print(f"  Old: {current_address}")
                print(f"  New: {new_address}")
                
                inv['location'] = new_address
                updated_count += 1
                
                # Check if coordinates need update (if generic Cph coords, usually)
                # We force update for precise location
                print("  Geocoding...", end=" ", flush=True)
                coords = geocode(new_address)
                if coords:
                    inv['coordinates'] = coords
                    print(f"OK ({coords})")
                else:
                    print("FAILED")
                
                # Sleep for rate limit
                time.sleep(1.2)
    
    print(f"\nUpdated {updated_count} investors.")
    
    # Save
    with open(INVESTORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(investors, f, indent=2, ensure_ascii=False)
    print("Saved investors.json")

if __name__ == "__main__":
    main()
