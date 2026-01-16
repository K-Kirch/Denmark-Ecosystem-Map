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
        const companyUpdate = {
            cvr: cvrResult.cvrNumber || company.cvr,
            verified: scoring.confidence >= 70,
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
 * Batch verify multiple companies
 * @param {string[]} companyIds - Array of company IDs
 * @param {number} delayMs - Delay between verifications
 * @returns {Promise<object>}
 */
export async function batchVerify(companyIds, delayMs = 5000) {
    const results = {
        total: companyIds.length,
        successful: 0,
        failed: 0,
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

        // Rate limiting between requests
        if (i < companyIds.length - 1) {
            console.log(`Waiting ${delayMs}ms before next verification...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

// Export for direct usage
export { getSupabase };
