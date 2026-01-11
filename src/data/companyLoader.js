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

    let allData = [];

    // Load companies.json (startups)
    try {
        const response = await fetch('/data/companies.json');
        if (response.ok) {
            const companies = await response.json();
            allData = allData.concat(companies);
            console.log(`Loaded ${companies.length} entries from companies.json`);
        }
    } catch (e) {
        console.warn('Could not load companies.json');
    }

    // Load investors.json (investors + supporters)
    try {
        const response = await fetch('/data/investors.json');
        if (response.ok) {
            const investors = await response.json();
            allData = allData.concat(investors);
            console.log(`Loaded ${investors.length} entries from investors.json`);
        }
    } catch (e) {
        console.warn('Could not load investors.json');
    }

    if (allData.length === 0) {
        console.error('No data files found');
    }

    companiesCache = allData;
    console.log(`Total loaded: ${companiesCache.length} companies/investors/supporters`);
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
        supporters: companies.filter(c => c.type === 'supporter').length,
        total: companies.length
    };
}

/**
 * Clear cache to force reload
 */
export function clearCache() {
    companiesCache = null;
}
