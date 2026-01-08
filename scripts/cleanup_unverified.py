"""
Cleanup Unverified Companies
============================
Removes companies that failed CVR validation.
Saves removed companies to a log file for review.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "companies.json"
REMOVED_FILE = DATA_DIR / "removed_companies.json"

def main():
    print("Cleaning up unverified companies...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    kept = []
    removed = []
    
    for c in data:
        # Always keep investors
        if c.get('type') == 'investor':
            kept.append(c)
            continue
            
        # Check startups
        if c.get('verified'):
            kept.append(c)
        else:
            removed.append(c)
            
    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(kept, f, indent=2)
        
    with open(REMOVED_FILE, 'w', encoding='utf-8') as f:
        json.dump(removed, f, indent=2)
        
    print(f"Cleanup Complete.")
    print(f"  Kept: {len(kept)} (of which {len([x for x in kept if x['type']=='investor'])} investors)")
    print(f"  Removed: {len(removed)}")
    print(f"  Removed log saved to: {REMOVED_FILE}")

if __name__ == "__main__":
    main()
