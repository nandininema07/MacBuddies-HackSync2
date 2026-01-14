-- Petitions table for community mobilization
CREATE TABLE IF NOT EXISTS petitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_signatures INTEGER DEFAULT 1000,
  signature_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed', 'achieved')),
  geographic_area TEXT, -- city, district, or state level
  affected_population INTEGER DEFAULT 0,
  severity_score DECIMAL(3,2) DEFAULT 0, -- calculated from linked reports
  trending_score DECIMAL(5,2) DEFAULT 0, -- recent signature velocity
  total_score DECIMAL(10,2) DEFAULT 0, -- combined ranking score
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Petition signatures
CREATE TABLE IF NOT EXISTS petition_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(petition_id, user_id)
);

-- Link petitions to related reports (evidence)
CREATE TABLE IF NOT EXISTS petition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(petition_id, report_id)
);

-- Government projects for self-updating database
CREATE TABLE IF NOT EXISTS government_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  budget DECIMAL(15,2),
  department TEXT,
  contractor_name TEXT,
  start_date DATE,
  expected_completion DATE,
  actual_completion DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed', 'rejected')),
  is_verified BOOLEAN DEFAULT false,
  verification_source TEXT,
  verification_notes TEXT,
  community_votes_up INTEGER DEFAULT 0,
  community_votes_down INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project verification votes
CREATE TABLE IF NOT EXISTS project_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES government_projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE petition_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE petition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_votes ENABLE ROW LEVEL SECURITY;

-- Petitions policies
CREATE POLICY "Anyone can view petitions" ON petitions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create petitions" ON petitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own petitions" ON petitions FOR UPDATE USING (auth.uid() = user_id);

-- Petition signatures policies
CREATE POLICY "Anyone can view non-anonymous signatures" ON petition_signatures 
  FOR SELECT USING (is_anonymous = false OR auth.uid() = user_id);
CREATE POLICY "Authenticated users can sign petitions" ON petition_signatures FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can remove their signature" ON petition_signatures FOR DELETE USING (auth.uid() = user_id);

-- Petition reports policies
CREATE POLICY "Anyone can view petition reports" ON petition_reports FOR SELECT USING (true);
CREATE POLICY "Petition owners can link reports" ON petition_reports FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM petitions WHERE id = petition_id AND user_id = auth.uid()));

-- Government projects policies
CREATE POLICY "Anyone can view verified projects" ON government_projects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit projects" ON government_projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their pending submissions" ON government_projects 
  FOR UPDATE USING (auth.uid() = submitted_by AND status = 'pending');

-- Project votes policies
CREATE POLICY "Anyone can view vote counts" ON project_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON project_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can change their vote" ON project_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their vote" ON project_votes FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_petitions_status ON petitions(status);
CREATE INDEX IF NOT EXISTS idx_petitions_total_score ON petitions(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_petition_signatures_petition ON petition_signatures(petition_id);
CREATE INDEX IF NOT EXISTS idx_government_projects_status ON government_projects(status);
CREATE INDEX IF NOT EXISTS idx_government_projects_city ON government_projects(city);
