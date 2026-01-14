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

  if (error) {
    console.error("Error fetching reports:", error)
    return []
  }

  return (data as Report[]) || []
}

export default async function MapPage() {
  const reports = await getReports()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MapContent reports={reports} />
    </div>
  )
}
