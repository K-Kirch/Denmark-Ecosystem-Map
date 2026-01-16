/**
 * Web Presence Checker
 * Validates company's online presence as a verification signal
 * 
 * Checks:
 * - Website reachability and basic validation
 * - LinkedIn company profile (via search)
 * - Basic social media presence indicators
 */

/**
 * Check if a website is reachable and looks legitimate
 * @param {string} url - Company website URL
 * @returns {Promise<object>}
 */
export async function checkWebsite(url) {
    if (!url) {
        return { reachable: false, reason: 'No URL provided' };
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(normalizedUrl, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DenmarkEcosystemBot/1.0)'
            }
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 405) {
            // 405 = Method Not Allowed, but site exists
            return {
                reachable: true,
                status: response.status,
                finalUrl: response.url,
                hasHttps: response.url.startsWith('https://')
            };
        }

        return {
            reachable: false,
            status: response.status,
            reason: `HTTP ${response.status}`
        };

    } catch (error) {
        return {
            reachable: false,
            reason: error.name === 'AbortError' ? 'Timeout' : error.message
        };
    }
}

/**
 * Check for LinkedIn company presence
 * Uses a simple search approach without API
 * @param {string} companyName 
 * @returns {Promise<object>}
 */
export async function checkLinkedIn(companyName) {
    if (!companyName) {
        return { found: false, reason: 'No company name' };
    }

    // We can't actually scrape LinkedIn without authentication
    // So we'll do a heuristic check by searching for the company
    // In a production system, you might use the LinkedIn API

    try {
        // Check if a LinkedIn company URL pattern exists
        // This is a proxy check - not definitive
        const searchUrl = `https://www.linkedin.com/company/${encodeURIComponent(
            companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        )}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(searchUrl, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DenmarkEcosystemBot/1.0)'
            }
        });

        clearTimeout(timeoutId);

        // LinkedIn might return 200 even for non-existent pages
        // but 404 definitely means not found
        if (response.ok) {
            return {
                found: true,
                possibleUrl: searchUrl,
                confidence: 'medium' // URL pattern match, not verified
            };
        }

        return { found: false, reason: 'No LinkedIn page at expected URL' };

    } catch (error) {
        return {
            found: false,
            reason: error.name === 'AbortError' ? 'Timeout' : 'Check failed'
        };
    }
}

/**
 * Quick social media presence check
 * @param {string} companyName 
 * @param {string} website 
 * @returns {Promise<object>}
 */
export async function checkSocialMedia(companyName, website) {
    const socialSignals = [];

    // If we have a website, we could parse it for social links
    // For now, we'll just note that more advanced checks are possible

    // Placeholder for future implementation:
    // - Parse website for social links
    // - Check Twitter/X handle availability
    // - Check Facebook page existence

    return {
        platforms: socialSignals,
        count: socialSignals.length
    };
}

/**
 * Perform full web presence check for a company
 * @param {object} company - Company data
 * @returns {Promise<object>}
 */
export async function checkWebPresence(company) {
    const { name, website } = company;

    console.log(`Web presence check: ${name}`);

    // Run checks in parallel for speed
    const [websiteResult, linkedInResult, socialResult] = await Promise.all([
        checkWebsite(website),
        checkLinkedIn(name),
        checkSocialMedia(name, website)
    ]);

    return {
        websiteReachable: websiteResult.reachable,
        websiteDetails: websiteResult,
        linkedInFound: linkedInResult.found,
        linkedInDetails: linkedInResult,
        socialMedia: socialResult.platforms,
        socialMediaCount: socialResult.count,
        // Simple presence score
        presenceScore: calculatePresenceScore(websiteResult, linkedInResult, socialResult)
    };
}

/**
 * Calculate a simple presence score
 */
function calculatePresenceScore(website, linkedin, social) {
    let score = 0;

    if (website.reachable) {
        score += 40;
        if (website.hasHttps) score += 10;
    }

    if (linkedin.found) {
        score += linkedin.confidence === 'high' ? 30 : 20;
    }

    score += Math.min(20, social.count * 5);

    return Math.min(100, score);
}

export { calculatePresenceScore };
