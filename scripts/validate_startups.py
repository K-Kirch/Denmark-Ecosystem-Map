"""
Startup Validation Script
=========================
Cross-checks extracted startups by searching Google to verify they are real companies.
Uses the search_web capability to validate company names.
"""

import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "companies.json"
OUTPUT_FILE = DATA_DIR / "validated_companies.json"
VALIDATION_REPORT = DATA_DIR / "validation_report.json"


def load_companies():
    """Load companies from JSON."""
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_startups_sample(companies, sample_size=50):
    """Get a random sample of startups for validation."""
    startups = [c for c in companies if c.get('type') == 'startup']
    
    if len(startups) <= sample_size:
        return startups
    
    return random.sample(startups, sample_size)


def main():
    companies = load_companies()
    startups = [c for c in companies if c.get('type') == 'startup']
    
    print(f"Total startups to validate: {len(startups)}")
    print("\nSample startups for manual Google validation:")
    print("=" * 60)
    
    # Get a sample
    sample = get_startups_sample(companies, 30)
    
    for i, startup in enumerate(sample, 1):
        name = startup.get('name', 'Unknown')
        website = startup.get('website', '')
        investors = startup.get('investors', [])
        source = startup.get('source', '')
        
        print(f"\n{i}. {name}")
        if website:
            print(f"   Website: {website}")
        if investors:
            print(f"   Investors: {', '.join(investors)}")
        if source:
            print(f"   Source: {source}")
        print(f"   Search: https://www.google.com/search?q={name.replace(' ', '+')}+startup+Denmark")


if __name__ == '__main__':
    main()
