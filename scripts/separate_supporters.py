import json
from pathlib import Path

# Config
DATA_DIR = Path(__file__).parent.parent / "data"
INVESTORS_FILE = DATA_DIR / "investors.json"
COMPANIES_FILE = DATA_DIR / "companies.json"

# Categories to treat as 'supporter' instead of 'investor'
SUPPORTER_CATEGORIES = {
    "Accelerator",
    "Incubator", 
    "Government Fund",
    "University",
    "Co-working",
    "Grant",
    "Education",
    "Network",
    "Hub",
    "Science Park",
    "Innovation Hub"
}

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def categorize_supporters():
    print("Separating ecosystem supporters...")
    
    # 1. Process investors.json
    investors = load_json(INVESTORS_FILE)
    supporter_count = 0
    
    for inv in investors:
        cat = inv.get('category')
        # Check exact category match or partial (e.g. "Tech Incubator")
        is_supporter = False
        if cat in SUPPORTER_CATEGORIES:
            is_supporter = True
        elif cat:
            for sc in SUPPORTER_CATEGORIES:
                if sc.lower() in cat.lower():
                    is_supporter = True
                    break
                    
        if is_supporter:
            inv['type'] = 'supporter'
            supporter_count += 1
            
    print(f"Update investors.json: Found {supporter_count} supporters.")
    save_json(INVESTORS_FILE, investors)
    
    # 2. Process companies.json (which contains merged data)
    # We apply the same logic to specific IDs if found, or just by category
    companies = load_json(COMPANIES_FILE)
    main_supporter_count = 0
    
    for comp in companies:
        if comp.get('type') == 'investor':
            cat = comp.get('category')
            is_supporter = False
            
            if cat in SUPPORTER_CATEGORIES:
                is_supporter = True
            elif cat:
                for sc in SUPPORTER_CATEGORIES:
                    if sc.lower() in cat.lower():
                        is_supporter = True
                        break
            
            if is_supporter:
                comp['type'] = 'supporter'
                main_supporter_count += 1
                
    print(f"Updated companies.json: Found {main_supporter_count} supporters.")
    save_json(COMPANIES_FILE, companies)
    
    print("Done! Don't forget to update the frontend code.")

if __name__ == "__main__":
    categorize_supporters()
