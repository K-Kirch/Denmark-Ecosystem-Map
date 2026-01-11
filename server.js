/**
 * Denmark Ecosystem Map - API Server
 * Express server for handling company data API
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Data file paths - different for dev vs production
const DATA_DIR = IS_PRODUCTION
    ? path.join(__dirname, 'dist', 'data')
    : path.join(__dirname, 'data');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');
const INVESTORS_FILE = path.join(DATA_DIR, 'investors.json');

// Middleware
app.use(express.json());

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static files in production
if (IS_PRODUCTION) {
    app.use(express.static(path.join(__dirname, 'dist')));

    // Serve data files
    app.use('/data', express.static(DATA_DIR));
}

/**
 * GET /api/companies - Get all companies
 */
app.get('/api/companies', async (req, res) => {
    try {
        const data = await fs.readFile(COMPANIES_FILE, 'utf-8');
        const companies = JSON.parse(data);
        res.json(companies);
    } catch (error) {
        console.error('Error reading companies:', error);
        res.status(500).json({ error: 'Failed to load companies' });
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

        // Read current data
        const data = await fs.readFile(COMPANIES_FILE, 'utf-8');
        const companies = JSON.parse(data);

        // Check for duplicate ID
        if (companies.some(c => c.id === newCompany.id)) {
            // Generate unique ID
            newCompany.id = `${newCompany.id}-${Date.now()}`;
        }

        // Add timestamp
        newCompany.lastUpdated = new Date().toISOString();

        // Add to array
        companies.push(newCompany);

        // Save back to file
        await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2), 'utf-8');

        console.log(`✓ Added new ${newCompany.type}: ${newCompany.name}`);

        res.status(201).json({
            success: true,
            company: newCompany
        });

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
        const data = await fs.readFile(COMPANIES_FILE, 'utf-8');
        const companies = JSON.parse(data);

        const stats = {
            total: companies.length,
            startups: companies.filter(c => c.type === 'startup').length,
            investors: companies.filter(c => c.type === 'investor').length,
            supporters: companies.filter(c => c.type === 'supporter').length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// SPA fallback - serve index.html for all non-API routes in production
if (IS_PRODUCTION) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     Denmark Ecosystem Map API Server          ║
║     Running on http://localhost:${PORT}          ║
║     Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}                        ║
╚═══════════════════════════════════════════════╝
    `);
});
