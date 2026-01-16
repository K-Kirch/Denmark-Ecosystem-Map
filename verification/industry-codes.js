/**
 * Danish NACE Industry Code Mappings
 * Used to classify companies as startup vs. holding vs. local service
 * 
 * Codes follow the Danish Standard Industrial Classification (DB07)
 * which aligns with EU NACE Rev. 2
 */

// Tech/Startup indicators - high-growth potential industries
export const STARTUP_CODES = {
    // Information and Communication (Section J)
    '58': { label: 'Publishing', score: 70 },
    '59': { label: 'Film/Video/TV Production', score: 60 },
    '60': { label: 'Broadcasting', score: 50 },
    '61': { label: 'Telecommunications', score: 75 },
    '62': { label: 'IT Services & Software', score: 100 },
    '620': { label: 'Computer Programming', score: 100 },
    '6201': { label: 'Computer Programming Activities', score: 100 },
    '6202': { label: 'IT Consultancy', score: 90 },
    '6203': { label: 'Computer Facilities Management', score: 85 },
    '6209': { label: 'Other IT Services', score: 85 },
    '63': { label: 'Information Services', score: 95 },
    '631': { label: 'Data Processing & Hosting', score: 95 },
    '6311': { label: 'Data Processing', score: 95 },
    '6312': { label: 'Web Portals', score: 90 },
    '639': { label: 'Other Information Services', score: 80 },

    // Scientific R&D (Section M)
    '72': { label: 'Scientific R&D', score: 95 },
    '721': { label: 'Natural Sciences R&D', score: 95 },
    '7211': { label: 'Biotechnology R&D', score: 100 },
    '7219': { label: 'Other Natural Sciences R&D', score: 90 },
    '722': { label: 'Social Sciences R&D', score: 70 },

    // Professional Services (often startup adjacent)
    '70': { label: 'Head Offices & Mgmt Consultancy', score: 50 },
    '702': { label: 'Management Consultancy', score: 60 },
    '7021': { label: 'PR & Communication', score: 65 },
    '7022': { label: 'Business Consultancy', score: 55 },

    // Manufacturing (Hardware/DeepTech)
    '21': { label: 'Pharmaceuticals Manufacturing', score: 85 },
    '212': { label: 'Pharmaceutical Preparations', score: 85 },
    '26': { label: 'Electronics Manufacturing', score: 90 },
    '261': { label: 'Electronic Components', score: 90 },
    '262': { label: 'Computers & Peripherals', score: 95 },
    '263': { label: 'Communication Equipment', score: 90 },
    '264': { label: 'Consumer Electronics', score: 80 },
    '265': { label: 'Measuring Instruments', score: 85 },
    '27': { label: 'Electrical Equipment', score: 75 },
    '28': { label: 'Machinery Manufacturing', score: 70 },

    // Financial Technology
    '64': { label: 'Financial Services', score: 70 },
    '6419': { label: 'Other Monetary Intermediation', score: 75 },
    '649': { label: 'Other Financial Services', score: 70 },
    '6499': { label: 'Other Financial Activities', score: 75 },
    '66': { label: 'Auxiliary Financial Services', score: 65 },
};

// Holding company indicators - investment vehicles, not operating businesses
export const HOLDING_CODES = {
    '6420': { label: 'Holding Companies', score: 100 },
    '642': { label: 'Activities of Holding Companies', score: 100 },
    '6430': { label: 'Trusts & Funds', score: 90 },
    '643': { label: 'Trusts, Funds & Similar', score: 90 },
    '6499': { label: 'Other Financial Services (often SPVs)', score: 60 },
    '7010': { label: 'Head Offices', score: 70 },
    '701': { label: 'Activities of Head Offices', score: 70 },
};

// Local service indicators - brick-and-mortar, geographically limited
export const LOCAL_SERVICE_CODES = {
    // Retail (Section G)
    '47': { label: 'Retail Trade', score: 100 },
    '471': { label: 'Retail in Stores', score: 100 },
    '472': { label: 'Food Retail', score: 100 },
    '4711': { label: 'Supermarkets', score: 100 },
    '4719': { label: 'Department Stores', score: 100 },
    '4721': { label: 'Fruit & Vegetables', score: 100 },
    '4724': { label: 'Bakery Retail', score: 100 },

    // Accommodation & Food Service (Section I)
    '55': { label: 'Accommodation', score: 90 },
    '551': { label: 'Hotels', score: 90 },
    '56': { label: 'Food & Beverage Service', score: 100 },
    '561': { label: 'Restaurants', score: 100 },
    '5610': { label: 'Restaurants & Cafes', score: 100 },
    '562': { label: 'Event Catering', score: 95 },
    '563': { label: 'Bars', score: 100 },

    // Personal Services (Section S)
    '96': { label: 'Personal Services', score: 100 },
    '9601': { label: 'Laundry Services', score: 100 },
    '9602': { label: 'Hairdressing & Beauty', score: 100 },
    '9603': { label: 'Funeral Services', score: 100 },
    '9604': { label: 'Physical Wellbeing', score: 95 },
    '9609': { label: 'Other Personal Services', score: 90 },

    // Construction (typically local)
    '41': { label: 'Building Construction', score: 80 },
    '42': { label: 'Civil Engineering', score: 70 },
    '43': { label: 'Specialized Construction', score: 85 },

    // Real Estate
    '68': { label: 'Real Estate', score: 90 },
    '681': { label: 'Real Estate with Own Property', score: 95 },
    '682': { label: 'Real Estate on Fee/Contract', score: 85 },
    '683': { label: 'Real Estate Management', score: 80 },
};

/**
 * Get industry classification from a Danish industry code
 * @param {string} code - The branchekode from CVR (e.g., "620100")
 * @returns {{ type: string, score: number, label: string }}
 */
export function classifyIndustryCode(code) {
    if (!code) {
        return { type: 'unknown', score: 50, label: 'Unknown' };
    }

    // Normalize code - remove spaces, leading zeros for matching
    const normalizedCode = code.toString().replace(/\s/g, '').replace(/^0+/, '');

    // Try progressively shorter prefixes for matching
    // e.g., "620100" -> try "620100", "62010", "6201", "620", "62", "6"
    for (let len = normalizedCode.length; len >= 2; len--) {
        const prefix = normalizedCode.substring(0, len);

        // Check holding codes first (most specific)
        if (HOLDING_CODES[prefix]) {
            return {
                type: 'holding',
                score: HOLDING_CODES[prefix].score,
                label: HOLDING_CODES[prefix].label
            };
        }

        // Check local service codes
        if (LOCAL_SERVICE_CODES[prefix]) {
            return {
                type: 'local_service',
                score: LOCAL_SERVICE_CODES[prefix].score,
                label: LOCAL_SERVICE_CODES[prefix].label
            };
        }

        // Check startup codes
        if (STARTUP_CODES[prefix]) {
            return {
                type: 'startup',
                score: STARTUP_CODES[prefix].score,
                label: STARTUP_CODES[prefix].label
            };
        }
    }

    // Default for unrecognized codes
    return { type: 'unknown', score: 50, label: 'Unclassified Industry' };
}

/**
 * Parse industry code string from CVR format
 * CVR format: "620100 Computerprogrammering"
 * @param {string} cvrIndustryString 
 * @returns {{ code: string, description: string }}
 */
export function parseIndustryString(cvrIndustryString) {
    if (!cvrIndustryString) {
        return { code: null, description: null };
    }

    const match = cvrIndustryString.match(/^(\d+)\s+(.+)$/);
    if (match) {
        return {
            code: match[1],
            description: match[2].trim()
        };
    }

    // If no match, might just be a code or description
    if (/^\d+$/.test(cvrIndustryString)) {
        return { code: cvrIndustryString, description: null };
    }

    return { code: null, description: cvrIndustryString };
}
