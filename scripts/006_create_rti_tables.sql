-- RTI Applications Table
CREATE TABLE IF NOT EXISTS rti_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES government_projects(id) ON DELETE SET NULL,
  template_type TEXT NOT NULL DEFAULT 'general',
  department TEXT NOT NULL,
  authority_name TEXT,
  authority_address TEXT,
  generated_text TEXT NOT NULL,
  user_edits TEXT,
  submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'response_received', 'closed')),
  submission_date TIMESTAMP WITH TIME ZONE,
  response_received_date TIMESTAMP WITH TIME ZONE,
  response_summary TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaint Letters Table
CREATE TABLE IF NOT EXISTS complaint_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  department TEXT NOT NULL,
  complaint_type TEXT NOT NULL DEFAULT 'general',
  generated_text TEXT NOT NULL,
  user_edits TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'resolved')),
  sent_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RTI Templates Table (for different departments)
CREATE TABLE IF NOT EXISTS rti_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  template_text TEXT NOT NULL,
  description TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rti_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rti_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rti_applications
CREATE POLICY "Users can view their own RTI applications" ON rti_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create RTI applications" ON rti_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RTI applications" ON rti_applications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for complaint_letters
CREATE POLICY "Users can view their own complaints" ON complaint_letters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create complaints" ON complaint_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own complaints" ON complaint_letters
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for rti_templates (public read)
CREATE POLICY "Anyone can view active templates" ON rti_templates
  FOR SELECT USING (is_active = TRUE);

-- Indexes
CREATE INDEX idx_rti_applications_user ON rti_applications(user_id);
CREATE INDEX idx_rti_applications_report ON rti_applications(related_report_id);
CREATE INDEX idx_rti_applications_status ON rti_applications(submission_status);
CREATE INDEX idx_complaint_letters_user ON complaint_letters(user_id);
CREATE INDEX idx_rti_templates_department ON rti_templates(department);
