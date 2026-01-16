/**
 * Confidence Scoring Module
 * Calculates a weighted confidence score for company verification
 * 
 * Scoring weights:
 * - CVR Status:     30% (is the company legally active?)
 * - Industry Code:  25% (is this a startup-type industry?)
 * - Company Age:    15% (is it in the startup age range?)
 * - Web Presence:   20% (does it have online signals?)
 * - Name Match:     10% (how well did the name match CVR records?)
 */

import { classifyIndustryCode } from './industry-codes.js';

// Scoring weights
const WEIGHTS = {
    cvrStatus: 0.30,
    industry: 0.25,
    age: 0.15,
    webPresence: 0.20,
    nameMatch: 0.10
};

// CVR Status mappings (Danish)
const STATUS_SCORES = {
    'normal': 100,
    'aktiv': 100,
    'active': 100,
    'under konkurs': 20,
    'konkurs': 0,
    'opløst': 0,
    'tvangsopløst': 0,
    'under frivillig likvidation': 30,
    'under tvangsopløsning': 10,
    'ophørt': 0,
    'slettet': 0,
};

/**
 * Calculate CVR status score
 * @param {string} status - Company status from CVR
 * @returns {number} 0-100 score
 */
function scoreCvrStatus(status) {
    if (!status) return 50; // Unknown

    const normalizedStatus = status.toLowerCase().trim();

    // Check for exact match first
    if (STATUS_SCORES[normalizedStatus] !== undefined) {
        return STATUS_SCORES[normalizedStatus];
    }

    // Check for partial matches
    for (const [key, score] of Object.entries(STATUS_SCORES)) {
        if (normalizedStatus.includes(key)) {
            return score;
        }
    }

    // Default for unknown status
    return 50;
}

/**
 * Calculate industry score based on industry code
 * @param {string} industryCode - Branchekode from CVR
 * @returns {{ score: number, classification: string, label: string }}
 */
function scoreIndustry(industryCode) {
    const classification = classifyIndustryCode(industryCode);
    return {
        score: classification.score,
        classification: classification.type,
        label: classification.label
    };
}

/**
 * Calculate age score - startups are typically 1-10 years old
 * @param {number|string} foundedYear - Year company was founded
 * @returns {number} 0-100 score
 */
function scoreAge(foundedYear) {
    if (!foundedYear) return 50; // Unknown age

    const currentYear = new Date().getFullYear();
    const year = parseInt(foundedYear);

    if (isNaN(year)) return 50;

    const age = currentYear - year;

    // Ideal startup age: 1-10 years
    if (age >= 1 && age <= 5) return 100;  // Prime startup years
    if (age > 5 && age <= 10) return 85;   // Scaling startup
    if (age > 10 && age <= 15) return 60;  // Mature but could be scale-up
    if (age > 15 && age <= 25) return 40;  // Established company
    if (age > 25) return 20;               // Legacy company
    if (age < 1) return 70;                // Very new (might not have traction yet)
    if (age < 0) return 0;                 // Invalid date

    return 50;
}

/**
 * Calculate web presence score
 * @param {object} webPresence - Web presence check results
 * @returns {number} 0-100 score
 */
function scoreWebPresence(webPresence) {
    if (!webPresence) return 0;

    let score = 0;

    // Website reachable (40 points)
    if (webPresence.websiteReachable) {
        score += 40;
    }

    // LinkedIn presence (30 points)
    if (webPresence.linkedInFound) {
        score += 30;
    }

    // Social media presence (20 points)
    if (webPresence.socialMedia && webPresence.socialMedia.length > 0) {
        score += Math.min(20, webPresence.socialMedia.length * 10);
    }

    // Recent press/news (10 points)
    if (webPresence.pressFound) {
        score += 10;
    }

    return Math.min(100, score);
}

/**
 * Calculate name match score using Levenshtein similarity
 * @param {string} searchedName - Name we searched for
 * @param {string} foundName - Name found in CVR
 * @returns {number} 0-100 score
 */
function scoreNameMatch(searchedName, foundName) {
    if (!searchedName || !foundName) return 0;

    const a = searchedName.toLowerCase().trim();
    const b = foundName.toLowerCase().trim();

    // Exact match
    if (a === b) return 100;

    // One contains the other
    if (a.includes(b) || b.includes(a)) return 90;

    // Calculate Levenshtein similarity
    const similarity = levenshteinSimilarity(a, b);
    return Math.round(similarity * 100);
}

/**
 * Levenshtein distance-based similarity (0-1)
 */
function levenshteinSimilarity(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Generate natural language justification
 * @param {object} scores - Individual component scores
 * @param {number} totalScore - Final confidence score
 * @param {string} classification - Company classification
 * @returns {string}
 */
function generateJustification(scores, totalScore, classification) {
    const parts = [];

    // Overall verdict
    if (totalScore >= 80) {
        parts.push(`High confidence (${totalScore}%) that this is a legitimate ${classification}.`);
    } else if (totalScore >= 60) {
        parts.push(`Moderate confidence (${totalScore}%) in ${classification} classification.`);
    } else if (totalScore >= 40) {
        parts.push(`Low confidence (${totalScore}%). Manual review recommended.`);
    } else {
        parts.push(`Very low confidence (${totalScore}%). This entry may not be valid.`);
    }

    // CVR Status
    if (scores.cvrStatus >= 80) {
        parts.push('CVR registry confirms active legal status.');
    } else if (scores.cvrStatus < 50) {
        parts.push('⚠️ Company appears inactive or dissolved in CVR registry.');
    }

    // Industry
    if (scores.industry.score >= 80 && scores.industry.classification === 'startup') {
        parts.push(`Industry code indicates tech/innovation sector: ${scores.industry.label}.`);
    } else if (scores.industry.classification === 'holding') {
        parts.push(`⚠️ Industry code suggests this is a holding company, not an operating startup.`);
    } else if (scores.industry.classification === 'local_service') {
        parts.push(`⚠️ Industry code indicates local/traditional business: ${scores.industry.label}.`);
    }

    // Age
    if (scores.age >= 80) {
        parts.push('Company age aligns with typical startup profile (1-10 years).');
    } else if (scores.age < 40) {
        parts.push('Company may be too established to classify as a startup.');
    }

    // Web Presence
    if (scores.webPresence >= 70) {
        parts.push('Strong online presence with active website and social profiles.');
    } else if (scores.webPresence < 30) {
        parts.push('Limited online presence detected.');
    }

    // Name Match
    if (scores.nameMatch < 70) {
        parts.push('Note: Company name in CVR differs from submitted name.');
    }

    return parts.join(' ');
}

/**
 * Calculate overall confidence score for a company
 * @param {object} data - Verification data
 * @returns {object} Scoring result
 */
export function calculateConfidence(data) {
    const {
        cvrStatus,
        industryCode,
        foundedYear,
        webPresence,
        searchedName,
        foundName
    } = data;

    // Calculate individual scores
    const scores = {
        cvrStatus: scoreCvrStatus(cvrStatus),
        industry: scoreIndustry(industryCode),
        age: scoreAge(foundedYear),
        webPresence: scoreWebPresence(webPresence),
        nameMatch: scoreNameMatch(searchedName, foundName)
    };

    // Calculate weighted total
    const total = Math.round(
        scores.cvrStatus * WEIGHTS.cvrStatus +
        scores.industry.score * WEIGHTS.industry +
        scores.age * WEIGHTS.age +
        scores.webPresence * WEIGHTS.webPresence +
        scores.nameMatch * WEIGHTS.nameMatch
    );

    // Determine classification
    let classification = scores.industry.classification;

    // Override classification based on combined signals
    if (scores.industry.classification === 'holding') {
        classification = 'holding';
    } else if (scores.industry.classification === 'local_service') {
        classification = 'local_service';
    } else if (total >= 70 && scores.industry.classification === 'startup') {
        classification = 'startup';
    } else if (total < 40) {
        classification = 'unknown';
    }

    // Determine if manual review is needed
    const needsReview = total >= 40 && total < 70;

    // Generate justification
    const justification = generateJustification(scores, total, classification);

    return {
        confidence: total,
        classification,
        needsReview,
        justification,
        breakdown: {
            cvrStatus: scores.cvrStatus,
            industry: scores.industry.score,
            industryLabel: scores.industry.label,
            age: scores.age,
            webPresence: scores.webPresence,
            nameMatch: scores.nameMatch
        },
        weights: WEIGHTS
    };
}
