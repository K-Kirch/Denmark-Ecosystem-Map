/**
 * Company Data Loader
 * Loads company data from JSON files for the ecosystem map
 */

// Cache for loaded data
let companiesCache = null;

/**
 * Load companies from the data files
 */
export async function loadCompanies() {
    if (companiesCache) {
        return companiesCache;
    }

    try {
        // Try loading from companies.json first
        const response = await fetch('/data/companies.json');
        if (response.ok) {
            companiesCache = await response.json();
            console.log(`Loaded ${companiesCache.length} companies from data file`);
            return companiesCache;
        }
    } catch (e) {
        console.warn('Could not load companies.json, using fallback data');
    }

    // Fallback to investors.json if companies.json doesn't exist
    try {
        const response = await fetch('/data/investors.json');
        if (response.ok) {
            companiesCache = await response.json();
            console.log(`Loaded ${companiesCache.length} investors from seed list`);
            return companiesCache;
        }
    } catch (e) {
        console.warn('Could not load investors.json');
    }

    // Final fallback - return empty array
    console.error('No data files found');
    companiesCache = [];
    return companiesCache;
}

/**
 * Get companies filtered by type
 */
export function getCompaniesByType(companies, type) {
    if (type === 'all') return companies;
    return companies.filter(company => company.type === type);
}

/**
 * Search companies by name, industry, or description
 */
export function searchCompanies(companies, query) {
    const lowerQuery = query.toLowerCase();
    return companies.filter(company =>
        company.name?.toLowerCase().includes(lowerQuery) ||
        company.industry?.toLowerCase().includes(lowerQuery) ||
        company.description?.toLowerCase().includes(lowerQuery) ||
        company.category?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get company by ID
 */
export function getCompanyById(companies, id) {
    return companies.find(company => company.id === id);
}

/**
 * Get counts by type
 */
export function getCounts(companies) {
    return {
        startups: companies.filter(c => c.type === 'startup').length,
        investors: companies.filter(c => c.type === 'investor').length,
        total: companies.length
    };
}

/**
 * Clear cache to force reload
 */
export function clearCache() {
    companiesCache = null;
}
