import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import MapContent from "@/components/map/map-content"
import type { Report } from "@/lib/types"

// 1. Fetch User Reports (Real Data)
async function getReports(): Promise<Report[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching reports:", error)
    return []
  }

  return (data as Report[]) || []
}

// 2. Mock AI Predictions (Simulated Data based on Projects)
async function getPredictions() {
  const supabase = await createClient()
  
  // Fetch actual government projects to base predictions on
  const { data: projects } = await supabase
    .from("government_projects")
    .select("*")
    .not("latitude", "is", null) // Only fetch projects with location data if available
    .limit(50) 
  
  if (!projects) return []

  // Transform projects into "Predicted Risks"
  return projects.map((p, i) => {
    // Simulation Logic: Mark every 3rd project as "Critical" for demo purposes
    const isHighRisk = i % 3 === 0;
    
    // Generate a mock AI Confidence Score
    const score = isHighRisk 
      ? Math.floor(Math.random() * (98 - 85 + 1) + 85) // High score for High Risk
      : Math.floor(Math.random() * (40 - 10 + 1) + 10); // Low score for Safe

    return {
      ...p,
      // Map project fields to Report-like structure for the Map Component
      id: `pred-${p.id}`,
      latitude: p.latitude || 19.0760 + (Math.random() * 0.05), // Fallback random lat if missing
      longitude: p.longitude || 72.8777 + (Math.random() * 0.05), // Fallback random lon if missing
      title: p.title,
      category: "infrastructure", // Default category
      
      // The AI Prediction Object
      prediction: {
        score: score,
        label: isHighRisk ? "High" : "Low", // Matches your badge logic
        contractor: p.contractor || "Unknown Contractor",
        riskFactor: isHighRisk ? "Contractor History & Delay Patterns" : "On Schedule"
      }
    }
  })
}

export default async function MapPage() {
  // Fetch both datasets in parallel
  const [reports, predictions] = await Promise.all([
    getReports(),
    getPredictions()
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Pass both real reports and AI predictions to the map */}
      <MapContent reports={reports} predictions={predictions} />
    </div>
  )
}