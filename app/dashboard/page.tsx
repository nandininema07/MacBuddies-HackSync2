import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { Header } from "@/components/header"
import type { DashboardStats, Report } from "@/lib/types"

// Extended interface to include the specific ranking data
interface ExtendedDashboardStats extends DashboardStats {
  topRisks: Array<{
    id: string
    title: string
    city: string
    upvotes: number
    department: string | null
    category: string
    risk_level: string | null
  }>
}

async function getDashboardStats(): Promise<ExtendedDashboardStats> {
  const supabase = await createClient()

  // Fetch all reports
  // 1. Order by upvotes descending for the "Ranking List"
  // 2. Order by creation date for "Recent Reports"
  const { data: reportsData, error } = await supabase
    .from("reports")
    .select("*")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false })

  if (error || !reportsData) {
    console.error("Error fetching dashboard stats:", error)
    return {
      totalReports: 0,
      verifiedReports: 0,
      resolvedReports: 0,
      estimatedLoss: 0,
      categoryCounts: {},
      cityCounts: [],
      recentReports: [],
      topRisks: []
    }
  }

  const reports = reportsData as Report[]

  // --- 1. Basic Stats ---
  const totalReports = reports.length
  const verifiedReports = reports.filter((r) => r.status === "verified" || r.status === "in_progress").length
  const resolvedReports = reports.filter((r) => r.status === "resolved").length
  // Sum estimated cost if it exists, otherwise 0
  const estimatedLoss = reports.reduce((sum, r) => sum + (Number(r.estimated_cost) || 0), 0)

  // --- 2. Category Breakdown ---
  const categoryCounts: Record<string, number> = {}
  reports.forEach((r) => {
    const cat = r.category || 'other'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  // --- 3. City Breakdown (Top 5) ---
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

  // --- 4. Recent Reports Feed ---
  // Re-sort strictly by date for the feed
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // --- 5. Ranking List (Top Priority Zones) ---
  // Top 10 issues ranked by community upvotes
  const topRisks = reports
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      title: r.title,
      city: r.city || "Unknown Location",
      upvotes: r.upvotes || 0,
      department: r.department || "Municipal Corporation",
      category: r.category || "General",
      risk_level: r.risk_level
    }))

  return {
    totalReports,
    verifiedReports,
    resolvedReports,
    estimatedLoss,
    categoryCounts,
    cityCounts,
    recentReports,
    topRisks,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Ensure your DashboardContent component is updated to accept 'topRisks' 
        or pass it to a specific sub-component 
      */}
      <DashboardContent stats={stats} />
    </div>
  )
}