/**
 * Truth Engine Test Script
 * Tests the CVR lookup and verification system
 * 
 * Usage: node verification/test.js
 */

import { lookupCompany } from './cvr-agent.js';
import { checkWebPresence } from './web-checker.js';
import { calculateConfidence } from './confidence-scorer.js';
import { classifyIndustryCode } from './industry-codes.js';

// Load environment variables
import { config } from 'dotenv';
config();

console.log('🔬 Truth Engine Test Suite\n');

// Test 1: Industry Code Classification
console.log('═══════════════════════════════════════════════════');
console.log('Test 1: Industry Code Classification');
console.log('═══════════════════════════════════════════════════');

const testCodes = [
    { code: '620100', expected: 'startup', name: 'Software Development' },
    { code: '642020', expected: 'holding', name: 'Holding Company' },
    { code: '561010', expected: 'local_service', name: 'Restaurant' },
    { code: '721900', expected: 'startup', name: 'R&D' },
    { code: '471111', expected: 'local_service', name: 'Retail Store' },
];

for (const test of testCodes) {
    const result = classifyIndustryCode(test.code);
    const passed = result.type === test.expected;
    console.log(`${passed ? '✓' : '✗'} ${test.code} (${test.name}): ${result.type} (expected: ${test.expected})`);
}

// Test 2: Confidence Scoring
console.log('\n═══════════════════════════════════════════════════');
console.log('Test 2: Confidence Scoring');
console.log('═══════════════════════════════════════════════════');

const testScenarios = [
    {
        name: 'Perfect Startup',
        data: {
            cvrStatus: 'Normal',
            industryCode: '620100',
            foundedYear: 2020,
            webPresence: { websiteReachable: true, linkedInFound: true, socialMedia: ['twitter'] },
            searchedName: 'TechStartup',
            foundName: 'TechStartup ApS'
        }
    },
    {
        name: 'Holding Company',
        data: {
            cvrStatus: 'Normal',
            industryCode: '642020',
            foundedYear: 2015,
            webPresence: { websiteReachable: false },
            searchedName: 'Holdings Ltd',
            foundName: 'Holdings Ltd'
        }
    },
    {
        name: 'Local Bakery',
        data: {
            cvrStatus: 'Normal',
            industryCode: '472400',
            foundedYear: 1995,
            webPresence: { websiteReachable: false },
            searchedName: 'Local Bakery',
            foundName: 'Local Bakery'
        }
    },
    {
        name: 'Dissolved Company',
        data: {
            cvrStatus: 'Opløst',
            industryCode: '620100',
            foundedYear: 2018,
            webPresence: { websiteReachable: false },
            searchedName: 'DeadStartup',
            foundName: 'DeadStartup ApS'
        }
    }
];

for (const scenario of testScenarios) {
    const result = calculateConfidence(scenario.data);
    console.log(`\n${scenario.name}:`);
    console.log(`  Confidence: ${result.confidence}%`);
    console.log(`  Classification: ${result.classification}`);
    console.log(`  Needs Review: ${result.needsReview}`);
    console.log(`  Justification: ${result.justification.substring(0, 100)}...`);
}

// Test 3: CVR Lookup (requires network)
console.log('\n═══════════════════════════════════════════════════');
console.log('Test 3: CVR Lookup (Live Test)');
console.log('═══════════════════════════════════════════════════');

async function testCvrLookup() {
    try {
        console.log('\nSearching for "Novo Nordisk"...');
        const result = await lookupCompany('Novo Nordisk');

        if (result.success) {
            console.log('✓ CVR Lookup successful!');
            console.log(`  Official Name: ${result.officialName}`);
            console.log(`  CVR Number: ${result.cvrNumber}`);
            console.log(`  Status: ${result.status}`);
            console.log(`  Industry: ${result.industryCode} - ${result.industryDescription}`);
            console.log(`  Legal Form: ${result.legalForm}`);
        } else {
            console.log('✗ CVR Lookup failed:', result.error);
        }

        return result;
    } catch (error) {
        console.log('✗ CVR Lookup error:', error.message);
        return null;
    }
}

// Test 4: Web Presence Check
async function testWebPresence() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('Test 4: Web Presence Check');
    console.log('═══════════════════════════════════════════════════');

    const result = await checkWebPresence({
        name: 'Pleo',
        website: 'https://pleo.io'
    });

    console.log('Pleo Web Presence:');
    console.log(`  Website Reachable: ${result.websiteReachable}`);
    console.log(`  LinkedIn Found: ${result.linkedInFound}`);
    console.log(`  Presence Score: ${result.presenceScore}`);
}

// Run all tests
async function runTests() {
    await testWebPresence();

    // Only run CVR lookup if --live flag is passed
    if (process.argv.includes('--live')) {
        await testCvrLookup();
    } else {
        console.log('\n💡 Skipping live CVR lookup. Run with --live to test browser automation.');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('Tests Complete!');
    console.log('═══════════════════════════════════════════════════');
}

runTests().catch(console.error);
