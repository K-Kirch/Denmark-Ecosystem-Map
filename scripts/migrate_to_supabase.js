/**
 * Migration Script: JSON → Supabase
 * 
 * Migrates existing JSON data files to Supabase PostgreSQL.
 * 
 * Usage:
 *   1. Create a Supabase project at https://supabase.com
 *   2. Run supabase/schema.sql in SQL Editor
 *   3. Copy .env.example to .env and fill in credentials
 *   4. Run: node scripts/migrate_to_supabase.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const BATCH_SIZE = 500;  // Insert in batches to avoid timeouts

// Supabase admin client (uses service role key for full access)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Load JSON file
 */
async function loadJSON(filename) {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Migrate companies
 */
async function migrateCompanies() {
    console.log('\n📦 Migrating companies...');

    const companies = await loadJSON('companies.json');
    console.log(`   Found ${companies.length} companies in JSON`);

    // Deduplicate by ID (keep first occurrence)
    const seen = new Set();
    const uniqueCompanies = companies.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
    console.log(`   Unique companies: ${uniqueCompanies.length} (${companies.length - uniqueCompanies.length} duplicates removed)`);

    let success = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < uniqueCompanies.length; i += BATCH_SIZE) {
        const batch = uniqueCompanies.slice(i, i + BATCH_SIZE);

        // Transform data for Supabase
        const rows = batch.map(company => ({
            id: company.id,
            name: company.name,
            type: company.type || 'startup',
            website: company.website,
            description: company.description,
            logo: company.logo,
            location: company.location,
            coordinates: company.coordinates || null,
            founded: company.founded,
            employees: company.employees,
            industries: company.industries || [],
            cvr: company.cvr,
            verified: company.verified || false,
            source: company.source,
            status: company.status || 'active'
        }));

        const { data, error } = await supabase
            .from('companies')
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
            errors += batch.length;
        } else {
            success += batch.length;
            process.stdout.write(`   ✓ ${success}/${uniqueCompanies.length} migrated\r`);
        }
    }

    console.log(`\n   ✅ Companies: ${success} success, ${errors} errors`);
    return { success, errors };
}

/**
 * Migrate investors
 */
async function migrateInvestors() {
    console.log('\n💰 Migrating investors...');

    const investors = await loadJSON('investors.json');
    console.log(`   Found ${investors.length} investors`);

    // Transform data
    const rows = investors.map(investor => ({
        id: investor.id,
        name: investor.name,
        type: investor.type,
        category: investor.category,
        logo: investor.logo,
        website: investor.website,
        portfolio_url: investor.portfolioUrl,
        location: investor.location,
        coordinates: investor.coordinates || null,
        founded: investor.founded,
        description: investor.description,
        focus: investor.focus || []
    }));

    const { data, error } = await supabase
        .from('investors')
        .upsert(rows, { onConflict: 'id' });

    if (error) {
        console.error(`   ❌ Failed:`, error.message);
        return { success: 0, errors: investors.length };
    }

    console.log(`   ✅ Investors: ${investors.length} migrated`);
    return { success: investors.length, errors: 0 };
}

/**
 * Migrate reports
 */
async function migrateReports() {
    console.log('\n📝 Migrating reports...');

    let reports;
    try {
        reports = await loadJSON('reports.json');
    } catch {
        console.log('   ⏭️  No reports.json found, skipping');
        return { success: 0, errors: 0 };
    }

    console.log(`   Found ${reports.length} reports`);

    // Transform data
    const rows = reports.map(report => ({
        id: report.id,
        company_id: report.companyId,
        company_name: report.companyName,
        reason: report.reason,
        reported_at: report.reportedAt
    }));

    const { data, error } = await supabase
        .from('reports')
        .upsert(rows, { onConflict: 'id' });

    if (error) {
        console.error(`   ❌ Failed:`, error.message);
        return { success: 0, errors: reports.length };
    }

    console.log(`   ✅ Reports: ${reports.length} migrated`);
    return { success: reports.length, errors: 0 };
}

/**
 * Main migration
 */
async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   Denmark Ecosystem → Supabase Migration      ║');
    console.log('╚═══════════════════════════════════════════════╝');

    // Check configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error('\n❌ Missing environment variables!');
        console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
        process.exit(1);
    }

    console.log(`\n🔗 Connecting to: ${process.env.SUPABASE_URL}`);

    const results = {
        companies: await migrateCompanies(),
        investors: await migrateInvestors(),
        reports: await migrateReports()
    };

    // Summary
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║   Migration Summary                           ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`   Companies: ${results.companies.success} ✅  ${results.companies.errors} ❌`);
    console.log(`   Investors: ${results.investors.success} ✅  ${results.investors.errors} ❌`);
    console.log(`   Reports:   ${results.reports.success} ✅  ${results.reports.errors} ❌`);
    console.log('');
}

main().catch(console.error);
