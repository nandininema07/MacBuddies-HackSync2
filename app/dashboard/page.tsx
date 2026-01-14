import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { Header } from "@/components/header"
import type { DashboardStats, Report } from "@/lib/types"

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  // Get all reports
  const { data: reports, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false })

  if (error || !reports) {
    return {
      totalReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      estimatedLoss: 0,
      categoryCounts: {},
      cityCounts: [],
      recentReports: [],
    }
  }

  // Calculate statistics
  const totalReports = reports.length
  const verifiedReports = reports.filter((r) => r.status === "verified" || r.status === "in_progress").length
  const resolvedReports = reports.filter((r) => r.status === "resolved").length
  const estimatedLoss = reports.reduce((sum, r) => sum + (r.estimated_cost || 0), 0)

  // Category counts
  const categoryCounts: Record<string, number> = {}
  reports.forEach((r) => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
  })

  // City counts
  const cityMap: Record<string, number> = {}
  reports.forEach((r) => {
    if (r.city) {
      cityMap[r.city] = (cityMap[r.city] || 0) + 1
    }
  })
  const cityCounts = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Recent reports
  const recentReports = reports.slice(0, 10) as Report[]

  return {
    totalReports,
    verifiedReports,
    resolvedReports,
    estimatedLoss,
    categoryCounts,
    cityCounts,
    recentReports,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DashboardContent stats={stats} />
    </div>
  )
}
