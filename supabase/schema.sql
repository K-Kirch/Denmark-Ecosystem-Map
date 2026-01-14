-- ============================================
-- Denmark Ecosystem Map - Supabase Schema
-- ============================================
-- Run this in Supabase SQL Editor to create tables
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- Companies Table
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'startup',
    website TEXT,
    description TEXT,
    logo TEXT,
    location TEXT,
    coordinates JSONB,  -- [lat, lng]
    founded INTEGER,
    employees INTEGER,
    industries JSONB DEFAULT '[]'::jsonb,  -- ["saas", "fintech"]
    cvr TEXT,
    verified BOOLEAN DEFAULT false,
    source TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_companies_cvr ON companies(cvr);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_verified ON companies(verified);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_industries ON companies USING GIN(industries);

-- ============================================
-- Investors Table
-- ============================================
CREATE TABLE IF NOT EXISTS investors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'investor' or 'supporter'
    category TEXT,  -- 'VC', 'Accelerator', 'Incubator', etc.
    logo TEXT,
    website TEXT,
    portfolio_url TEXT,
    location TEXT,
    coordinates JSONB,  -- [lat, lng]
    founded INTEGER,
    description TEXT,
    focus JSONB DEFAULT '[]'::jsonb,  -- ["Tech", "SaaS", "B2B"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investors_name ON investors(name);
CREATE INDEX IF NOT EXISTS idx_investors_type ON investors(type);
CREATE INDEX IF NOT EXISTS idx_investors_category ON investors(category);

-- ============================================
-- Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'reviewed', 'resolved'
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    CONSTRAINT fk_company
        FOREIGN KEY(company_id) 
        REFERENCES companies(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- Row Level Security (RLS) - Ready for Auth
-- ============================================
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for companies" ON companies
    FOR SELECT USING (true);

CREATE POLICY "Public read access for investors" ON investors
    FOR SELECT USING (true);

-- Reports: Only authenticated users can read
CREATE POLICY "Authenticated read access for reports" ON reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert policies (for future use with auth)
CREATE POLICY "Anyone can submit reports" ON reports
    FOR INSERT WITH CHECK (true);

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investors_updated_at
    BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
