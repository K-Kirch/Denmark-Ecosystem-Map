-- ============================================
-- Verification Results Table
-- Stores the outcome of company verification checks
-- ============================================

CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- CVR Registry Data
    cvr_number TEXT,
    cvr_status TEXT,
    industry_code TEXT,
    industry_description TEXT,
    legal_form TEXT,
    company_purpose TEXT,
    
    -- Scoring & Classification
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    classification TEXT CHECK (classification IN ('startup', 'holding', 'local_service', 'unknown')),
    justification TEXT,
    needs_review BOOLEAN DEFAULT false,
    
    -- Raw Data Storage
    web_presence JSONB,
    raw_cvr_data JSONB,
    
    -- Timestamps
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one result per company
    UNIQUE(company_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_verification_company ON verification_results(company_id);
CREATE INDEX IF NOT EXISTS idx_verification_score ON verification_results(confidence_score);
CREATE INDEX IF NOT EXISTS idx_verification_classification ON verification_results(classification);
CREATE INDEX IF NOT EXISTS idx_verification_needs_review ON verification_results(needs_review) WHERE needs_review = true;

-- Enable RLS
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;

-- Read policy for authenticated users
CREATE POLICY "Authenticated read access for verification_results" ON verification_results
    FOR SELECT USING (true);

-- Service role can insert/update
CREATE POLICY "Service role can manage verification_results" ON verification_results
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anon to read (for API)
CREATE POLICY "Anon read access for verification_results" ON verification_results
    FOR SELECT USING (true);

-- Allow anon to insert/update (for API during verification)
CREATE POLICY "Anon can upsert verification_results" ON verification_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can update verification_results" ON verification_results
    FOR UPDATE USING (true);

-- ============================================
-- Add needs_review column to companies if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'needs_review'
    ) THEN
        ALTER TABLE companies ADD COLUMN needs_review BOOLEAN DEFAULT false;
    END IF;
END $$;
