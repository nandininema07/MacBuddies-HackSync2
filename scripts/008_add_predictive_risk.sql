-- Add contractor_risk_score to government_projects
ALTER TABLE government_projects 
ADD COLUMN IF NOT EXISTS contractor_risk_score INT DEFAULT 0;

-- Add completion_date if missing
ALTER TABLE government_projects
ADD COLUMN IF NOT EXISTS completion_date DATE;

-- Create a table for tracking contractor risk history
CREATE TABLE IF NOT EXISTS contractor_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name TEXT NOT NULL UNIQUE,
  total_projects INT DEFAULT 0,
  flagged_projects INT DEFAULT 0,
  risk_score INT DEFAULT 0, -- 0-100 scale
  is_blacklisted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contractor_risk_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view contractor risk profiles"
  ON contractor_risk_profiles FOR SELECT
  USING (true);

-- Insert known problematic contractors for demo
INSERT INTO contractor_risk_profiles (contractor_name, total_projects, flagged_projects, risk_score, is_blacklisted)
VALUES 
  ('Shiv Shakti Infra', 15, 8, 75, false),
  ('Apex Roadways', 22, 12, 80, true),
  ('National Construction Co.', 50, 5, 20, false),
  ('Metro Builders', 30, 3, 15, false),
  ('Highway Developers Ltd', 18, 9, 70, false)
ON CONFLICT (contractor_name) DO NOTHING;

-- Update existing projects with completion dates for demo
UPDATE government_projects
SET completion_date = COALESCE(actual_completion, expected_completion, start_date + INTERVAL '6 months')
WHERE completion_date IS NULL;
