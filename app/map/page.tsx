import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { MapContent } from "@/components/map/map-content"
import type { Report } from "@/lib/types"

async function getReports(): Promise<Report[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })

  return (data as Report[]) || []
}

// --- MOCK AI ENGINE (No Python needed) ---
async function getPredictions() {
  const supabase = await createClient()
  const { data: projects } = await supabase.from("government_projects").select("*")
  
  if (!projects) return []

  return projects.map((p, i) => {
    // Logic: Every 2nd project is high risk (simulating contractor history)
    const isHighRisk = i % 2 === 0;
    const score = isHighRisk ? Math.floor(Math.random() * (95 - 75 + 1) + 75) : Math.floor(Math.random() * (40 - 20 + 1) + 20);

    return {
      ...p,
      prediction: {
        score: score,
        label: score > 75 ? "CRITICAL" : "SAFE",
        contractor: isHighRisk ? "Shiv Shakti Infra (Flagged)" : "Reliable Build Co"
      }
    }
  })
}

export default async function MapPage() {
  const [reports, predictions] = await Promise.all([
    getReports(),
    getPredictions()
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MapContent reports={reports} predictions={predictions} />
    </div>
  )
}
