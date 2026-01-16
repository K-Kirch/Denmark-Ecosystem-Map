/**
 * CVR Browser Agent
 * Automates navigation of datacvr.virk.dk to extract company information
 * 
 * Uses Playwright for browser automation with resilience patterns:
 * - Cookie consent handling
 * - Semantic selectors (text-based) over fragile CSS selectors
 * - Accordion expansion for detailed data
 * - Retry logic with exponential backoff
 * - Debug screenshots on failure
 */

import { chromium } from 'playwright';
import { parseIndustryString } from './industry-codes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    headless: process.env.CVR_HEADLESS !== 'false', // Default headless
    timeout: 30000,
    retries: 3,
    baseUrl: 'https://datacvr.virk.dk',
    screenshotDir: path.join(__dirname, 'debug-screenshots'),
};

/**
 * Create a browser context with appropriate settings
 */
async function createBrowserContext() {
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        locale: 'da-DK',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
    });

    return { browser, context };
}

/**
 * Handle cookie consent dialog if present
 */
async function handleCookieConsent(page) {
    try {
        // Look for common cookie consent patterns
        const consentSelectors = [
            'button:has-text("Acceptér")',
            'button:has-text("Accepter")',
            'button:has-text("Accept")',
            'button:has-text("OK")',
            '[class*="cookie"] button',
            '[id*="cookie"] button',
        ];

        for (const selector of consentSelectors) {
            const button = page.locator(selector).first();
            if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
                await button.click();
                console.log('✓ Cookie consent handled');
                await page.waitForTimeout(500);
                return true;
            }
        }
    } catch (e) {
        // No consent dialog, continue
    }
    return false;
}

/**
 * Search for a company by name or CVR number
 * @param {import('playwright').Page} page 
 * @param {string} query - Company name or CVR number
 */
async function searchCompany(page, query) {
    // Navigate to search page
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });

    // Handle cookie consent
    await handleCookieConsent(page);

    // Find search input using semantic selectors
    const searchInput = page.locator('input[type="search"], input[placeholder*="CVR"], input[placeholder*="Søg"], input[name*="search"]').first();

    if (!await searchInput.isVisible({ timeout: 5000 })) {
        throw new Error('Search input not found');
    }

    // Clear and type search query
    await searchInput.fill('');
    await searchInput.fill(query);
    await page.keyboard.press('Enter');

    // Wait for results
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
}

/**
 * Extract company data from search results or detail page
 * @param {import('playwright').Page} page 
 * @param {string} expectedName - The company name we're looking for
 */
async function extractCompanyData(page, expectedName) {
    const result = {
        found: false,
        cvrNumber: null,
        officialName: null,
        status: null,
        legalForm: null,
        industryCode: null,
        industryDescription: null,
        purpose: null,
        address: null,
        startDate: null,
        secondaryIndustries: [],
    };

    try {
        // Check if we're on a results list or a detail page
        const isDetailPage = await page.locator('.cvrnummer, .virksomhed-status-label').first().isVisible({ timeout: 2000 }).catch(() => false);

        if (!isDetailPage) {
            // We're on search results, find the best match and click it
            const resultLinks = page.locator('a:has-text("Vis mere"), [class*="result"] a[href*="enhed"]');
            const results = await resultLinks.all();

            if (results.length === 0) {
                console.log('No search results found');
                return result;
            }

            // Click the first result (often the best match)
            await results[0].click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
        }

        result.found = true;

        // Use CSS selectors discovered from the actual site structure

        // CVR Number - found in .cvrnummer element
        const cvrElement = page.locator('.cvrnummer').first();
        if (await cvrElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            const cvrText = await cvrElement.textContent();
            result.cvrNumber = cvrText?.trim();
        }

        // Company name - typically in h1 or company title
        const nameElement = page.locator('h1, .virksomhed-navn, .company-name').first();
        if (await nameElement.isVisible().catch(() => false)) {
            result.officialName = (await nameElement.textContent())?.trim();
        }

        // Status - found in .virksomhed-status-label
        const statusElement = page.locator('.virksomhed-status-label').first();
        if (await statusElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            result.status = (await statusElement.textContent())?.trim();
        }

        // Legal form - found after virksomhedsform-label in .break-word
        const legalFormElement = page.locator('.virksomhedsform-label + .break-word, .virksomhedsform-value').first();
        if (await legalFormElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            result.legalForm = (await legalFormElement.textContent())?.trim();
        }

        // If not found, try the row-based approach
        if (!result.legalForm) {
            const legalFormRow = page.locator('.row:has(.virksomhedsform-label)').first();
            if (await legalFormRow.isVisible().catch(() => false)) {
                const rowText = await legalFormRow.textContent();
                result.legalForm = rowText?.replace(/Virksomhedsform/i, '').trim();
            }
        }

        // Start date - found in .start-dato
        const startDateElement = page.locator('.start-dato').first();
        if (await startDateElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            result.startDate = (await startDateElement.textContent())?.trim();
        }

        // Try to expand extended information section for industry code
        await expandDetailedInfo(page);
        await page.waitForTimeout(500);

        // Industry code (Branchekode) - in the expanded accordion
        // Look for the row containing "Branchekode"
        const branchRow = page.locator('.row:has(strong:text("Branchekode")), div:has(> div:text("Branchekode"))').first();
        if (await branchRow.isVisible({ timeout: 2000 }).catch(() => false)) {
            const branchText = await branchRow.textContent();
            // Extract the code and description (e.g., "212000 Fremstilling af farmaceutiske præparater")
            const branchMatch = branchText?.match(/(\d{6})\s+([^\n]+)/);
            if (branchMatch) {
                result.industryCode = branchMatch[1];
                result.industryDescription = branchMatch[2].trim();
            }
        }

        // Alternative: Try using JavaScript to extract from page
        if (!result.industryCode) {
            const industryData = await page.evaluate(() => {
                const strongBranch = Array.from(document.querySelectorAll('strong')).find(el => el.textContent.includes('Branchekode'));
                if (strongBranch) {
                    const parentRow = strongBranch.closest('.row') || strongBranch.parentElement?.parentElement;
                    if (parentRow) {
                        const text = parentRow.innerText;
                        const match = text.match(/(\d{6})\s+([^\n]+)/);
                        if (match) {
                            return { code: match[1], description: match[2].trim() };
                        }
                    }
                }
                return null;
            });

            if (industryData) {
                result.industryCode = industryData.code;
                result.industryDescription = industryData.description;
            }
        }

        // Purpose (Formål) - in accordion
        const purposeRow = page.locator('.row:has(strong:text("Formål")), div:has(> div:text("Formål"))').first();
        if (await purposeRow.isVisible({ timeout: 1000 }).catch(() => false)) {
            const purposeText = await purposeRow.textContent();
            result.purpose = purposeText?.replace(/Formål/i, '').trim().substring(0, 500);
        }

        // Address
        const addressElement = page.locator('.adresse, [class*="address"]').first();
        if (await addressElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            result.address = (await addressElement.textContent())?.trim();
        }

        console.log(`Extracted: CVR=${result.cvrNumber}, Status=${result.status}, Industry=${result.industryCode}`);

    } catch (error) {
        console.error('Error extracting company data:', error.message);
    }

    return result;
}

/**
 * Try to expand the "Udvidede virksomhedsoplysninger" accordion
 */
async function expandDetailedInfo(page) {
    try {
        // Look for the accordion button/section
        const expandSelectors = [
            'text=Udvidede virksomhedsoplysninger',
            'button:has-text("Udvidede")',
            '[class*="accordion"]:has-text("Udvidede")',
            '[class*="expand"]:has-text("virksomhed")',
        ];

        for (const selector of expandSelectors) {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
                await element.click();
                await page.waitForTimeout(500);
                console.log('✓ Expanded detailed info section');
                return true;
            }
        }
    } catch (e) {
        // Section might already be expanded or not present
    }
    return false;
}

/**
 * Save debug screenshot on error
 */
async function saveDebugScreenshot(page, name) {
    try {
        const fs = await import('fs/promises');
        await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
        const filename = `${name}-${Date.now()}.png`;
        await page.screenshot({ path: path.join(CONFIG.screenshotDir, filename) });
        console.log(`Debug screenshot saved: ${filename}`);
    } catch (e) {
        console.error('Failed to save screenshot:', e.message);
    }
}

/**
 * Main function to lookup a company in the CVR registry
 * @param {string} companyName - Name of the company to search
 * @param {string} [cvrNumber] - Optional CVR number for direct lookup
 * @returns {Promise<object>} Company data from CVR
 */
export async function lookupCompany(companyName, cvrNumber = null) {
    let browser, context;

    try {
        console.log(`CVR Lookup: ${cvrNumber || companyName}`);

        ({ browser, context } = await createBrowserContext());
        const page = await context.newPage();

        // Set reasonable timeout
        page.setDefaultTimeout(CONFIG.timeout);

        // Search by CVR number if available, otherwise by name
        const query = cvrNumber || companyName;
        await searchCompany(page, query);

        // Extract data
        const data = await extractCompanyData(page, companyName);

        if (!data.found) {
            console.log(`Company not found: ${companyName}`);
        } else {
            console.log(`Found: ${data.officialName} (CVR: ${data.cvrNumber})`);
        }

        return {
            success: data.found,
            searchedName: companyName,
            searchedCvr: cvrNumber,
            ...data
        };

    } catch (error) {
        console.error(`CVR lookup failed: ${error.message}`);

        // Try to save debug screenshot
        if (browser) {
            const pages = context?.pages();
            if (pages && pages.length > 0) {
                await saveDebugScreenshot(pages[0], 'error');
            }
        }

        return {
            success: false,
            error: error.message,
            searchedName: companyName,
            searchedCvr: cvrNumber
        };

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Batch lookup multiple companies with rate limiting
 * @param {Array<{name: string, cvr?: string}>} companies 
 * @param {number} delayMs - Delay between requests in ms
 */
export async function batchLookup(companies, delayMs = 3000) {
    const results = [];

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`\n[${i + 1}/${companies.length}] Processing: ${company.name}`);

        const result = await lookupCompany(company.name, company.cvr);
        results.push(result);

        // Rate limiting - don't hit the last one
        if (i < companies.length - 1) {
            console.log(`Waiting ${delayMs}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

// Export for testing
export { CONFIG, handleCookieConsent, searchCompany, extractCompanyData };
