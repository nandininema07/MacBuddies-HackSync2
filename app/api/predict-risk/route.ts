import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Known high-risk contractors (for demo - in production, fetch from DB)
const BAD_CONTRACTORS = ["Shiv Shakti Infra", "Apex Roadways", "Highway Developers Ltd"]

interface ProjectData {
  id: string
  name: string
  contractor_name: string | null
  completion_date: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
}

interface ReportData {
  latitude: number
  longitude: number
  severity: string
}

function calculatePredictiveRisk(project: ProjectData, nearbyReports: ReportData[], contractorRiskScore: number) {
  const currentDate = new Date()
  let riskScore = 0
  const factors = {
    age_factor: 0,
    cluster_factor: 0,
    contractor_factor: 0,
    seasonal_multiplier: 1,
  }

  // --- FACTOR 1: Age Decay (30% weight) ---
  if (project.completion_date) {
    const completionDate = new Date(project.completion_date)
    const ageDays = Math.floor((currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24))

    // Asphalt roads typically fail after 1000 days without maintenance
    if (ageDays > 1000) {
      factors.age_factor = 30
    } else if (ageDays > 365) {
      factors.age_factor = 15
    } else if (ageDays > 180) {
      factors.age_factor = 8
    }
  }
  riskScore += factors.age_factor

  // --- FACTOR 2: Spatial Clustering (40% weight) ---
  // If there are reports within proximity of this project
  if (nearbyReports.length > 0) {
    // Weight by severity
    const weightedCount = nearbyReports.reduce((sum, report) => {
      const severityWeight =
        report.severity === "critical" ? 3 : report.severity === "high" ? 2 : report.severity === "medium" ? 1.5 : 1
      return sum + severityWeight
    }, 0)

    // 5+ weighted reports nearby = distinct sign of systemic failure
    factors.cluster_factor = Math.min(40, weightedCount * 6)
  }
  riskScore += factors.cluster_factor

  // --- FACTOR 3: Contractor History (30% weight) ---
  if (contractorRiskScore > 0) {
    factors.contractor_factor = Math.min(30, (contractorRiskScore / 100) * 30)
  } else if (project.contractor_name && BAD_CONTRACTORS.includes(project.contractor_name)) {
    factors.contractor_factor = 30
  }
  riskScore += factors.contractor_factor

  // --- FACTOR 4: Monsoon Multiplier (June-September) ---
  const currentMonth = currentDate.getMonth() + 1 // 1-12
  if (currentMonth >= 6 && currentMonth <= 9) {
    factors.seasonal_multiplier = 1.5
    riskScore = Math.min(100, riskScore * 1.5)
  }

  // Determine risk label
  let riskLabel: "SAFE" | "MODERATE" | "CRITICAL" = "SAFE"
  if (riskScore > 75) {
    riskLabel = "CRITICAL"
  } else if (riskScore > 40) {
    riskLabel = "MODERATE"
  }

  // Generate forecast reason
  const reasons: string[] = []
  if (factors.cluster_factor > 20) {
    reasons.push(`High report density (${nearbyReports.length} nearby)`)
  }
  if (factors.contractor_factor > 15) {
    reasons.push(`Contractor '${project.contractor_name}' has poor track record`)
  }
  if (factors.age_factor > 15) {
    reasons.push("Infrastructure age exceeds maintenance threshold")
  }
  if (factors.seasonal_multiplier > 1) {
    reasons.push("Monsoon season increases failure probability")
  }

  const forecastReason = reasons.length > 0 ? reasons.join(". ") + "." : "No significant risk factors detected."

  return {
    predicted_risk: Math.round(riskScore),
    risk_label: riskLabel,
    forecast_reason: forecastReason,
    factors,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all projects with location data
    const { data: projects, error: projectsError } = await supabase
      .from("government_projects")
      .select("id, name, contractor_name, completion_date, latitude, longitude, city, contractor_risk_score")
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (projectsError) throw projectsError

    // Fetch all reports for spatial analysis
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("latitude, longitude, severity")

    if (reportsError) throw reportsError

    // Fetch contractor risk profiles
    const { data: contractorProfiles } = await supabase
      .from("contractor_risk_profiles")
      .select("contractor_name, risk_score")

    const contractorRiskMap = new Map((contractorProfiles || []).map((c) => [c.contractor_name, c.risk_score]))

    const predictions = (projects || []).map((project) => {
      // Filter reports within ~1km (0.01 degrees) of project
      const nearbyReports = (reports || []).filter((report) => {
        if (!project.latitude || !project.longitude) return false
        const latDiff = Math.abs(report.latitude - project.latitude)
        const lngDiff = Math.abs(report.longitude - project.longitude)
        return latDiff < 0.01 && lngDiff < 0.01
      })

      // Get contractor risk score
      const contractorRisk = project.contractor_name ? contractorRiskMap.get(project.contractor_name) || 0 : 0

      const analysis = calculatePredictiveRisk(project as ProjectData, nearbyReports, contractorRisk)

      return {
        project_id: project.id,
        project_name: project.name,
        location: {
          lat: project.latitude!,
          lng: project.longitude!,
        },
        prediction: analysis,
      }
    })

    // Sort by risk score descending
    predictions.sort((a, b) => b.prediction.predicted_risk - a.prediction.predicted_risk)

    return NextResponse.json(predictions)
  } catch (error) {
    console.error("Predictive risk error:", error)
    return NextResponse.json({ error: "Failed to calculate predictive risk" }, { status: 500 })
  }
}
