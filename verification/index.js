/**
 * Verification Orchestrator
 * Main entry point for company verification
 * 
 * Coordinates:
 * - CVR registry lookup via browser automation
 * - Web presence checking
 * - Confidence scoring
 * - Database updates
 */

import { createClient } from '@supabase/supabase-js';
import { lookupCompany } from './cvr-agent.js';
import { checkWebPresence } from './web-checker.js';
import { calculateConfidence } from './confidence-scorer.js';

// Initialize Supabase client with service role for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
    if (!supabase) {
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
        }
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return supabase;
}

/**
 * Verify a single company
 * @param {string} companyId - ID of the company in the database
 * @returns {Promise<object>} Verification result
 */
export async function verifyCompany(companyId) {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Starting verification for: ${companyId}`);
    console.log(`${'='.repeat(50)}`);

    try {
        // 1. Fetch company from database
        const db = getSupabase();
        const { data: company, error: fetchError } = await db
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (fetchError || !company) {
            throw new Error(`Company not found: ${companyId}`);
        }

        console.log(`Company: ${company.name}`);
        console.log(`Location: ${company.location}`);
        console.log(`Website: ${company.website || 'N/A'}`);

        // 2. CVR Registry Lookup
        console.log('\n--- CVR Registry Lookup ---');
        const cvrResult = await lookupCompany(company.name, company.cvr);

        // 3. Web Presence Check (parallel would be ideal, but CVR needs browser)
        console.log('\n--- Web Presence Check ---');
        const webPresence = await checkWebPresence({
            name: company.name,
            website: company.website
        });

        // 4. Extract founded year from CVR start date if available
        let foundedYear = company.founded;
        if (cvrResult.startDate && !foundedYear) {
            const match = cvrResult.startDate.match(/(\d{4})/);
            if (match) {
                foundedYear = parseInt(match[1]);
            }
        }

        // 5. Calculate Confidence Score
        console.log('\n--- Confidence Scoring ---');
        const scoring = calculateConfidence({
            cvrStatus: cvrResult.status,
            industryCode: cvrResult.industryCode,
            foundedYear,
            webPresence: {
                websiteReachable: webPresence.websiteReachable,
                linkedInFound: webPresence.linkedInFound,
                socialMedia: webPresence.socialMedia,
                pressFound: false // Not implemented yet
            },
            searchedName: company.name,
            foundName: cvrResult.officialName
        });

        console.log(`Confidence: ${scoring.confidence}%`);
        console.log(`Classification: ${scoring.classification}`);
        console.log(`Needs Review: ${scoring.needsReview}`);

        // 6. Prepare verification result
        const verificationResult = {
            company_id: companyId,
            cvr_number: cvrResult.cvrNumber,
            cvr_status: cvrResult.status,
            industry_code: cvrResult.industryCode,
            industry_description: cvrResult.industryDescription,
            legal_form: cvrResult.legalForm,
            company_purpose: cvrResult.purpose,
            confidence_score: scoring.confidence,
            classification: scoring.classification,
            justification: scoring.justification,
            web_presence: webPresence,
            raw_cvr_data: {
                ...cvrResult,
                searchDuration: Date.now() - startTime
            },
            needs_review: scoring.needsReview
        };

        // 7. Save to verification_results table
        const { error: insertError } = await db
            .from('verification_results')
            .upsert(verificationResult, { onConflict: 'company_id' });

        if (insertError) {
            console.warn('Failed to save verification result:', insertError.message);
            // Don't throw - we still have the result
        }

        // 8. Update company record with verification data
        // Note: verified=true means "has been processed", not "passed verification"
        // The actual pass/fail is determined by confidence score in verification_results
        const companyUpdate = {
            cvr: cvrResult.cvrNumber || company.cvr,
            verified: true,  // Always mark as verified after processing
            needs_review: scoring.needsReview,
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await db
            .from('companies')
            .update(companyUpdate)
            .eq('id', companyId);

        if (updateError) {
            console.warn('Failed to update company:', updateError.message);
        }

        const duration = Date.now() - startTime;
        console.log(`\n✓ Verification complete in ${duration}ms`);

        return {
            success: true,
            companyId,
            companyName: company.name,
            confidence: scoring.confidence,
            classification: scoring.classification,
            justification: scoring.justification,
            needsReview: scoring.needsReview,
            cvr: {
                number: cvrResult.cvrNumber,
                status: cvrResult.status,
                industryCode: cvrResult.industryCode,
                industryDescription: cvrResult.industryDescription,
                legalForm: cvrResult.legalForm
            },
            webPresence: {
                websiteReachable: webPresence.websiteReachable,
                linkedInFound: webPresence.linkedInFound
            },
            duration
        };

    } catch (error) {
        console.error(`Verification failed: ${error.message}`);

        return {
            success: false,
            companyId,
            error: error.message,
            duration: Date.now() - startTime
        };
    }
}

/**
 * Get companies pending verification
 * @param {number} limit - Max number to return
 * @returns {Promise<Array>}
 */
export async function getPendingVerifications(limit = 10) {
    const db = getSupabase();

    // Get companies that haven't been verified recently
    const { data, error } = await db
        .from('companies')
        .select('id, name, cvr, website, location')
        .eq('verified', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to fetch pending verifications: ${error.message}`);
    }

    return data || [];
}

/**
 * Get verification queue status
 * @returns {Promise<object>}
 */
export async function getQueueStatus() {
    const db = getSupabase();

    const [pendingResult, completedResult, reviewResult] = await Promise.all([
        db.from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('verified', false)
            .eq('status', 'active'),
        db.from('verification_results')
            .select('*', { count: 'exact', head: true }),
        db.from('verification_results')
            .select('*', { count: 'exact', head: true })
            .eq('needs_review', true)
    ]);

    return {
        pending: pendingResult.count || 0,
        completed: completedResult.count || 0,
        needsReview: reviewResult.count || 0
    };
}

/**
 * Rate limit detection state
 */
const rateLimitState = {
    consecutiveSearchFailures: 0,  // Search itself failed (timeout, blocked, etc.)
    consecutiveFailures: 0,         // Verification errors
    lastAlertTime: null,
    isPaused: false
};

const RATE_LIMIT_THRESHOLDS = {
    searchFailureLimit: 3,  // 3 consecutive search failures = likely rate limited
    failureLimit: 3,        // 3 consecutive verification errors = pause
    pauseDuration: 300000,  // 5 minutes pause when rate limited
    alertCooldown: 600000   // 10 minutes between alerts
};

/**
 * Check if we're likely rate limited and handle it
 * @param {object} result - Verification result
 * @param {object} rawCvrData - Raw CVR lookup data to check if search succeeded
 * @returns {object} { isRateLimited: boolean, shouldPause: boolean, message: string }
 */
function checkRateLimit(result, rawCvrData) {
    // Case 1: Verification itself failed (error thrown)
    if (!result.success) {
        rateLimitState.consecutiveFailures++;
        rateLimitState.consecutiveSearchFailures = 0;
    }
    // Case 2: CVR search failed (couldn't even find results - likely blocked)
    // This is different from "company not found" - check if search itself worked
    else if (rawCvrData && rawCvrData.error) {
        // Search had an error (timeout, blocked, etc.)
        rateLimitState.consecutiveSearchFailures++;
        rateLimitState.consecutiveFailures = 0;
    }
    // Case 3: Search worked but company not found (legitimate miss - NOT rate limiting)
    else if (!result.cvr?.number && rawCvrData?.success === false) {
        // This is a legitimate "company not in CVR" - don't count it
        // Reset the failure counters
        rateLimitState.consecutiveSearchFailures = 0;
        rateLimitState.consecutiveFailures = 0;
        return { isRateLimited: false, shouldPause: false };
    }
    // Case 4: Successful verification with CVR
    else {
        rateLimitState.consecutiveSearchFailures = 0;
        rateLimitState.consecutiveFailures = 0;
        return { isRateLimited: false, shouldPause: false };
    }

    const isRateLimited =
        rateLimitState.consecutiveSearchFailures >= RATE_LIMIT_THRESHOLDS.searchFailureLimit ||
        rateLimitState.consecutiveFailures >= RATE_LIMIT_THRESHOLDS.failureLimit;

    if (isRateLimited) {
        const message = rateLimitState.consecutiveSearchFailures >= RATE_LIMIT_THRESHOLDS.searchFailureLimit
            ? `⚠️ RATE LIMIT DETECTED: ${rateLimitState.consecutiveSearchFailures} consecutive CVR searches failed (possible blocking)`
            : `⚠️ ERROR DETECTED: ${rateLimitState.consecutiveFailures} consecutive verification failures`;

        return { isRateLimited: true, shouldPause: true, message };
    }

    return { isRateLimited: false, shouldPause: false };
}

/**
 * Log rate limit alert (could be extended to send email/webhook)
 */
function alertRateLimit(message) {
    const now = Date.now();

    // Avoid spamming alerts
    if (rateLimitState.lastAlertTime &&
        (now - rateLimitState.lastAlertTime) < RATE_LIMIT_THRESHOLDS.alertCooldown) {
        return;
    }

    rateLimitState.lastAlertTime = now;

    console.log('\n' + '🚨'.repeat(25));
    console.log(message);
    console.log(`Pausing for ${RATE_LIMIT_THRESHOLDS.pauseDuration / 60000} minutes...`);
    console.log('🚨'.repeat(25) + '\n');

    // TODO: Add webhook/email notification here if desired
    // Example: await fetch('your-webhook-url', { method: 'POST', body: JSON.stringify({ alert: message }) });
}

/**
 * Batch verify multiple companies with rate limit detection
 * @param {string[]} companyIds - Array of company IDs
 * @param {number} delayMs - Delay between verifications
 * @returns {Promise<object>}
 */
export async function batchVerify(companyIds, delayMs = 5000) {
    const results = {
        total: companyIds.length,
        successful: 0,
        failed: 0,
        rateLimitPauses: 0,
        results: []
    };

    for (let i = 0; i < companyIds.length; i++) {
        const id = companyIds[i];
        console.log(`\n[${i + 1}/${companyIds.length}] Verifying: ${id}`);

        const result = await verifyCompany(id);
        results.results.push(result);

        if (result.success) {
            results.successful++;
        } else {
            results.failed++;
        }

        // Check for rate limiting
        const rateLimitCheck = checkRateLimit(result);
        if (rateLimitCheck.isRateLimited) {
            alertRateLimit(rateLimitCheck.message);
            results.rateLimitPauses++;

            // Pause for the configured duration
            console.log(`⏸️ Pausing batch verification for ${RATE_LIMIT_THRESHOLDS.pauseDuration / 60000} minutes...`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_THRESHOLDS.pauseDuration));

            // Reset counters after pause
            rateLimitState.consecutiveNullCvr = 0;
            rateLimitState.consecutiveFailures = 0;
            console.log('▶️ Resuming batch verification...');
        }

        // Rate limiting between requests
        if (i < companyIds.length - 1) {
            console.log(`Waiting ${delayMs}ms before next verification...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // Log final summary
    console.log('\n' + '='.repeat(50));
    console.log('BATCH VERIFICATION COMPLETE');
    console.log(`Total: ${results.total} | Successful: ${results.successful} | Failed: ${results.failed}`);
    if (results.rateLimitPauses > 0) {
        console.log(`⚠️ Rate limit pauses: ${results.rateLimitPauses}`);
    }
    console.log('='.repeat(50));

    return results;
}

/**
 * Parallel batch verification - runs multiple verifications concurrently
 * @param {string[]} companyIds - Array of company IDs
 * @param {number} concurrency - Number of parallel workers (default: 3)
 * @param {number} delayMs - Delay between batches in ms
 * @returns {Promise<object>}
 */
export async function parallelBatchVerify(companyIds, concurrency = 3, delayMs = 2000) {
    console.log('\n' + '🚀'.repeat(25));
    console.log(`PARALLEL VERIFICATION: ${companyIds.length} companies with ${concurrency} workers`);
    console.log('🚀'.repeat(25) + '\n');

    const startTime = Date.now();
    const results = {
        total: companyIds.length,
        successful: 0,
        failed: 0,
        rateLimitPauses: 0,
        results: []
    };

    // Process in chunks of 'concurrency' size
    for (let i = 0; i < companyIds.length; i += concurrency) {
        const chunk = companyIds.slice(i, i + concurrency);
        const chunkNum = Math.floor(i / concurrency) + 1;
        const totalChunks = Math.ceil(companyIds.length / concurrency);

        console.log(`\n[Chunk ${chunkNum}/${totalChunks}] Processing ${chunk.length} companies in parallel...`);

        // Run verifications in parallel
        const chunkResults = await Promise.allSettled(
            chunk.map(async (id, idx) => {
                console.log(`  [${i + idx + 1}/${companyIds.length}] Starting: ${id}`);
                const result = await verifyCompany(id);
                console.log(`  [${i + idx + 1}/${companyIds.length}] Done: ${id} (${result.confidence}% - ${result.classification})`);
                return result;
            })
        );

        // Process results
        for (const settled of chunkResults) {
            if (settled.status === 'fulfilled') {
                const result = settled.value;
                results.results.push(result);
                if (result.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }

                // Check for rate limiting
                const rateLimitCheck = checkRateLimit(result, result.cvr);
                if (rateLimitCheck.isRateLimited) {
                    alertRateLimit(rateLimitCheck.message);
                    results.rateLimitPauses++;

                    console.log(`⏸️ Pausing for ${RATE_LIMIT_THRESHOLDS.pauseDuration / 60000} minutes...`);
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_THRESHOLDS.pauseDuration));

                    rateLimitState.consecutiveSearchFailures = 0;
                    rateLimitState.consecutiveFailures = 0;
                    console.log('▶️ Resuming...');
                }
            } else {
                results.failed++;
                console.error(`  ❌ Error: ${settled.reason?.message || 'Unknown error'}`);
            }
        }

        // Delay between chunks (not between individual requests)
        if (i + concurrency < companyIds.length) {
            console.log(`  Waiting ${delayMs}ms before next chunk...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / results.total;

    console.log('\n' + '🏁'.repeat(25));
    console.log('PARALLEL BATCH COMPLETE');
    console.log(`Total: ${results.total} | Successful: ${results.successful} | Failed: ${results.failed}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s | Avg: ${(avgTime / 1000).toFixed(1)}s per company`);
    if (results.rateLimitPauses > 0) {
        console.log(`⚠️ Rate limit pauses: ${results.rateLimitPauses}`);
    }
    console.log('🏁'.repeat(25));

    return results;
}

// Export rate limit state for monitoring
export function getRateLimitStatus() {
    return {
        ...rateLimitState,
        thresholds: RATE_LIMIT_THRESHOLDS
    };
}

// Export for direct usage
export { getSupabase };
