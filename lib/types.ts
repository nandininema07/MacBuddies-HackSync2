export interface Report {
  id: string
  user_id: string | null
  title: string
  description: string | null
  category: "road" | "bridge" | "building" | "drainage" | "electrical" | "water" | "other"
  severity: "low" | "medium" | "high" | "critical"
  status: "pending" | "verified" | "in_progress" | "resolved" | "rejected"
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  image_url: string | null
  ai_classification: AIClassification | null
  ai_confidence: number | null
  estimated_cost: number | null
  actual_cost: number | null
  contractor_name: string | null
  department: string | null
  upvotes: number
  created_at: string
  updated_at: string
}

export interface AIClassification {
  category: string
  severity: string
  issues_detected: string[]
  quality_score: number
  recommendations: string[]
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  city: string | null
  state: string | null
  preferred_language: "en" | "hi"
  reports_count: number
  reputation_score: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  totalReports: number
  verifiedReports: number
  resolvedReports: number
  estimatedLoss: number
  categoryCounts: Record<string, number>
  cityCounts: { city: string; count: number }[]
  recentReports: Report[]
  // Add this new field:
  topRisks?: Array<{
    id: string
    title: string
    city: string
    upvotes: number
    department: string | null
    category: string
    risk_level: string | null
  }>
}

export interface Petition {
  id: string
  user_id: string | null
  title: string
  description: string
  target_signatures: number
  signature_count: number
  status: "active" | "escalated" | "closed" | "achieved"
  geographic_area: string | null
  affected_population: number
  severity_score: number
  trending_score: number
  total_score: number
  escalated_at: string | null
  created_at: string
  updated_at: string
}

export interface PetitionSignature {
  id: string
  petition_id: string
  user_id: string | null
  is_anonymous: boolean
  comment: string | null
  created_at: string
}

export interface GovernmentProject {
  id: string
  submitted_by: string | null
  name: string
  description: string | null
  budget: number | null
  department: string | null
  contractor_name: string | null
  start_date: string | null
  expected_completion: string | null
  actual_completion: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  state: string | null
  status: "pending" | "verified" | "disputed" | "rejected"
  is_verified: boolean
  verification_source: string | null
  verification_notes: string | null
  community_votes_up: number
  community_votes_down: number
  created_at: string
  updated_at: string
}

export interface RTIApplication {
  id: string
  user_id: string | null
  related_report_id: string | null
  related_project_id: string | null
  template_type: string
  department: string
  authority_name: string | null
  authority_address: string | null
  generated_text: string
  user_edits: string | null
  submission_status: "draft" | "submitted" | "response_received" | "closed"
  submission_date: string | null
  response_received_date: string | null
  response_summary: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  // Joined data
  report?: Report
  project?: GovernmentProject
}

export interface ComplaintLetter {
  id: string
  user_id: string | null
  related_report_id: string | null
  department: string
  complaint_type: string
  generated_text: string
  user_edits: string | null
  status: "draft" | "sent" | "acknowledged" | "resolved"
  sent_date: string | null
  created_at: string
  updated_at: string
}

export interface RTITemplate {
  id: string
  name: string
  department: string
  template_text: string
  description: string | null
  state: string | null
  is_active: boolean
  created_at: string
}

export type RTIDocumentType = "rti" | "complaint"

export interface PredictiveRisk {
  project_id: string
  project_name: string
  location: {
    lat: number
    lng: number
  }
  prediction: {
    predicted_risk: number
    risk_label: "SAFE" | "MODERATE" | "CRITICAL"
    forecast_reason: string
    factors: {
      age_factor: number
      cluster_factor: number
      contractor_factor: number
      seasonal_multiplier: number
    }
  }
}

export interface ContractorRiskProfile {
  id: string
  contractor_name: string
  total_projects: number
  flagged_projects: number
  risk_score: number
  is_blacklisted: boolean
  last_updated: string
  created_at: string
}
