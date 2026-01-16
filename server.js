/**
 * Denmark Ecosystem Map - API Server
 * Express server with Supabase backend
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// Supabase Client
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// Middleware
// ============================================
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static files in production
if (IS_PRODUCTION) {
    app.use(express.static(path.join(__dirname, 'dist')));
}

// ============================================
// API Routes
// ============================================

/**
 * GET /api/companies - Get all companies
 */
app.get('/api/companies', async (req, res) => {
    try {
        const { data: companies, error } = await supabase
            .from('companies')
            .select('*')
            .neq('status', 'inactive');

        if (error) throw error;

        // Transform to match existing frontend format
        const formatted = companies.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            website: c.website,
            description: c.description,
            logo: c.logo,
            location: c.location,
            coordinates: c.coordinates,
            founded: c.founded,
            employees: c.employees,
            industries: c.industries || [],
            cvr: c.cvr,
            verified: c.verified,
            source: c.source,
            status: c.status
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error reading companies:', error);
        res.status(500).json({ error: 'Failed to load companies' });
    }
});

/**
 * GET /api/investors - Get all investors
 */
app.get('/api/investors', async (req, res) => {
    try {
        const { data: investors, error } = await supabase
            .from('investors')
            .select('*');

        if (error) throw error;

        // Transform to match existing frontend format
        const formatted = investors.map(i => ({
            id: i.id,
            name: i.name,
            type: i.type,
            category: i.category,
            logo: i.logo,
            website: i.website,
            portfolioUrl: i.portfolio_url,
            location: i.location,
            coordinates: i.coordinates,
            founded: i.founded,
            description: i.description,
            focus: i.focus || []
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error reading investors:', error);
        res.status(500).json({ error: 'Failed to load investors' });
    }
});

/**
 * POST /api/companies - Add a new company
 */
app.post('/api/companies', async (req, res) => {
    try {
        const newCompany = req.body;

        // Validate required fields
        if (!newCompany.name || !newCompany.type || !newCompany.location) {
            return res.status(400).json({
                error: 'Missing required fields: name, type, location'
            });
        }

        // Validate type
        if (!['startup', 'investor', 'supporter'].includes(newCompany.type)) {
            return res.status(400).json({
                error: 'Invalid type. Must be "startup", "investor", or "supporter"'
            });
        }

        // Generate ID if not provided
        const id = newCompany.id || newCompany.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const companyData = {
            id: id,
            name: newCompany.name,
            type: newCompany.type,
            website: newCompany.website,
            description: newCompany.description,
            logo: newCompany.logo,
            location: newCompany.location,
            coordinates: newCompany.coordinates,
            founded: newCompany.founded,
            employees: newCompany.employees,
            industries: newCompany.industries || [],
            cvr: newCompany.cvr,
            verified: false,
            source: 'user-submitted',
            status: 'active'
        };

        const { data, error } = await supabase
            .from('companies')
            .insert([companyData])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                // Duplicate key - add timestamp to ID
                companyData.id = `${id}-${Date.now()}`;
                const { data: retryData, error: retryError } = await supabase
                    .from('companies')
                    .insert([companyData])
                    .select()
                    .single();
                if (retryError) throw retryError;
                return res.status(201).json({ success: true, company: retryData });
            }
            throw error;
        }

        console.log(`✓ Added new ${newCompany.type}: ${newCompany.name}`);
        res.status(201).json({ success: true, company: data });

    } catch (error) {
        console.error('Error adding company:', error);
        res.status(500).json({ error: 'Failed to add company' });
    }
});

/**
 * GET /api/stats - Get statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        const { count: total } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'inactive');

        const { count: startups } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'startup')
            .neq('status', 'inactive');

        const { count: investors } = await supabase
            .from('investors')
            .select('*', { count: 'exact', head: true });

        const { count: supporters } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'supporter')
            .neq('status', 'inactive');

        res.json({
            total: (total || 0) + (investors || 0),
            startups: startups || 0,
            investors: investors || 0,
            supporters: supporters || 0
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * PATCH /api/companies/:id/status - Update company status
 */
app.patch('/api/companies/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Missing required field: status' });
        }

        const { data, error } = await supabase
            .from('companies')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Company not found' });
        }

        console.log(`✓ Updated ${data.name} status to: ${status}`);
        res.json({
            success: true,
            message: `Company status updated to ${status}`,
            company: { id: data.id, name: data.name, status: data.status }
        });

    } catch (error) {
        console.error('Error updating company status:', error);
        res.status(500).json({ error: 'Failed to update company status' });
    }
});

/**
 * GET /api/reports - Get all reports
 */
app.get('/api/reports', async (req, res) => {
    try {
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*')
            .order('reported_at', { ascending: false });

        if (error) throw error;

        // Transform to match existing frontend format
        const formatted = reports.map(r => ({
            id: r.id,
            companyId: r.company_id,
            companyName: r.company_name,
            reason: r.reason,
            status: r.status,
            reportedAt: r.reported_at
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error reading reports:', error);
        res.status(500).json({ error: 'Failed to load reports' });
    }
});

/**
 * POST /api/reports - Submit a company report
 */
app.post('/api/reports', async (req, res) => {
    try {
        const { companyId, companyName, reason } = req.body;

        if (!companyId || !companyName || !reason) {
            return res.status(400).json({
                error: 'Missing required fields: companyId, companyName, reason'
            });
        }

        const reportData = {
            id: `report-${Date.now()}`,
            company_id: companyId,
            company_name: companyName,
            reason: reason,
            status: 'pending'
        };

        const { data, error } = await supabase
            .from('reports')
            .insert([reportData])
            .select()
            .single();

        if (error) throw error;

        console.log(`⚠ Report submitted for: ${companyName}`);
        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            report: {
                id: data.id,
                companyId: data.company_id,
                companyName: data.company_name,
                reason: data.reason,
                reportedAt: data.reported_at
            }
        });

    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// ============================================
// Verification API Routes
// ============================================

// Dynamic import for verification module (ESM)
let verificationModule = null;
async function getVerificationModule() {
    if (!verificationModule) {
        verificationModule = await import('./verification/index.js');
    }
    return verificationModule;
}

/**
 * GET /api/verify/queue - Get verification queue status
 * NOTE: Static routes must come BEFORE parameterized routes
 */
app.get('/api/verify/queue', async (req, res) => {
    try {
        const verification = await getVerificationModule();
        const status = await verification.getQueueStatus();
        res.json(status);
    } catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({ error: 'Failed to get queue status' });
    }
});

/**
 * GET /api/verify/pending - Get companies pending verification
 */
app.get('/api/verify/pending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const verification = await getVerificationModule();
        const pending = await verification.getPendingVerifications(limit);
        res.json({ count: pending.length, companies: pending });
    } catch (error) {
        console.error('Pending verification error:', error);
        res.status(500).json({ error: 'Failed to get pending verifications' });
    }
});

/**
 * POST /api/verify/batch - Start batch verification (background)
 */
app.post('/api/verify/batch', async (req, res) => {
    try {
        const { companyIds, limit } = req.body;

        let idsToVerify = companyIds;

        // If no specific IDs provided, get pending ones
        if (!idsToVerify || idsToVerify.length === 0) {
            const verification = await getVerificationModule();
            const pending = await verification.getPendingVerifications(limit || 5);
            idsToVerify = pending.map(c => c.id);
        }

        if (idsToVerify.length === 0) {
            return res.json({
                success: true,
                message: 'No companies to verify',
                total: 0
            });
        }

        // Start batch in background (don't await)
        const verification = await getVerificationModule();
        verification.batchVerify(idsToVerify, 5000).then(results => {
            console.log(`Batch verification complete: ${results.successful}/${results.total} successful`);
        }).catch(err => {
            console.error('Batch verification failed:', err);
        });

        res.json({
            success: true,
            message: `Started verification of ${idsToVerify.length} companies`,
            total: idsToVerify.length,
            companyIds: idsToVerify
        });

    } catch (error) {
        console.error('Batch verification error:', error);
        res.status(500).json({ error: 'Failed to start batch verification' });
    }
});

/**
 * POST /api/verify/:companyId - Verify a single company
 * NOTE: This parameterized route must come AFTER static routes (queue, pending, batch)
 */
app.post('/api/verify/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        const verification = await getVerificationModule();
        const result = await verification.verifyCompany(companyId);

        if (result.success) {
            res.json({
                success: true,
                confidence: result.confidence,
                classification: result.classification,
                justification: result.justification,
                needsReview: result.needsReview,
                cvr: result.cvr,
                webPresence: result.webPresence,
                duration: result.duration
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                companyId
            });
        }

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
});

/**
 * GET /api/verify/:companyId/result - Get existing verification result
 */
app.get('/api/verify/:companyId/result', async (req, res) => {
    try {
        const { companyId } = req.params;

        const { data, error } = await supabase
            .from('verification_results')
            .select('*')
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            return res.status(404).json({
                error: 'No verification result found',
                companyId
            });
        }

        res.json({
            companyId: data.company_id,
            confidence: data.confidence_score,
            classification: data.classification,
            justification: data.justification,
            needsReview: data.needs_review,
            cvr: {
                number: data.cvr_number,
                status: data.cvr_status,
                industryCode: data.industry_code,
                industryDescription: data.industry_description,
                legalForm: data.legal_form
            },
            verifiedAt: data.verified_at
        });

    } catch (error) {
        console.error('Get result error:', error);
        res.status(500).json({ error: 'Failed to get verification result' });
    }
});

// ============================================
// SPA Fallback
// ============================================
if (IS_PRODUCTION) {
    app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     Denmark Ecosystem Map API Server          ║
║     Running on http://localhost:${PORT}          ║
║     Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}                        ║
║     Database: Supabase                        ║
╚═══════════════════════════════════════════════╝
    `);
});
