# Database Migration Notes

> **Created:** 2026-01-12  
> **Updated:** 2026-01-14  
> **Status:** Supabase preparation complete

## Current State
- `companies.json`: ~6.7 MB, 5,000+ companies
- `investors.json`: ~22 KB, 35 investors
- `reports.json`: User-submitted company reports

## Problem
JSON files work but have limitations:
- Full file rewrite on every update
- No indexing (scans all records for searches)
- No safe concurrent writes
- Memory usage grows with file size

---

## Supabase Setup Guide

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (~2 minutes)
3. Note your project URL and API keys from Settings → API

### 2. Configure Environment
```bash
# Copy the template
cp .env.example .env

# Edit .env with your credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Create Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/schema.sql`
3. Run the SQL to create tables

### 4. Migrate Existing Data
```bash
node scripts/migrate_to_supabase.js
```

This will migrate all companies, investors, and reports to Supabase.

---

## Database Schema

| Table | Key Columns | Indexes |
|-------|-------------|---------|
| `companies` | id, name, cvr, industries, verified | cvr, name, industries (GIN) |
| `investors` | id, name, category, focus | name, type, category |
| `reports` | id, company_id, reason, status | company_id, status |

---

## Options Considered

### Option 1: SQLite (Recommended for MVP)
**Pros:**
- Single `.db` file, no server needed
- Fast indexed queries on CVR, name, industry
- Works with `better-sqlite3` in Node.js
- Zero additional infrastructure

**Cons:**
- Still single-writer (fine for read-heavy apps)
- Need migration script

### Option 2: Supabase (For Future Growth) ✅ **SELECTED**
**Pros:**
- Managed PostgreSQL, zero ops
- Built-in auth, real-time subscriptions
- Dashboard for data management
- Free tier: 500 MB, 50K MAU

**Cons:**
- Network latency (~20-50ms per request)
- $25/month Pro plan at scale
- Region mismatch risk with Cloud Run
- More complexity

---

## Migration Checklist

- [x] Create database schema for companies, investors, reports
- [x] Write migration script from JSON → Supabase
- [x] Create Supabase client module
- [x] Add environment variable template
- [ ] Update `server.js` API routes to use database queries
- [ ] Test locally before deploying to Cloud Run
- [ ] Update Cloud Run environment variables

