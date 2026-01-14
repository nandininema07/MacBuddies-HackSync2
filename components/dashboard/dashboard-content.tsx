"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/stats-card"
import { ReportCard } from "@/components/report-card"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { CityChart } from "@/components/dashboard/city-chart"
import { StatusChart } from "@/components/dashboard/status-chart"
import { TrendChart } from "@/components/dashboard/trend-chart"
import { useI18n } from "@/lib/i18n/context"
import type { DashboardStats, Report } from "@/lib/types"
import { FileText, CheckCircle, AlertTriangle, IndianRupee, User, Trophy, Activity } from "lucide-react"

interface DashboardContentProps {
  stats: DashboardStats
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const { t } = useI18n()
  const [userReports, setUserReports] = useState<Report[]>([])
  
  // New state for personal stats
  const [userStats, setUserStats] = useState({
    total: 0,
    verified: 0,
    resolved: 0
  })

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // 1. Fetch User's Recent Reports (List)
      const reportsQuery = supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6)

      // 2. Get Counts (Personal Analysis)
      // We use count: 'exact', head: true to get just the number without downloading all rows
      const totalCountQuery = supabase
        .from("reports")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)

      const verifiedCountQuery = supabase
        .from("reports")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("status", "verified")

      const resolvedCountQuery = supabase
        .from("reports")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("status", "resolved")

      // Execute all queries in parallel
      const [reportsRes, totalRes, verifiedRes, resolvedRes] = await Promise.all([
        reportsQuery,
        totalCountQuery,
        verifiedCountQuery,
        resolvedCountQuery
      ])

      if (reportsRes.data) setUserReports(reportsRes.data)
      
      setUserStats({
        total: totalRes.count || 0,
        verified: verifiedRes.count || 0,
        resolved: resolvedRes.count || 0
      })
    }

    fetchUserData()
  }, [])

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
    return `₹${amount.toLocaleString("en-IN")}`
  }

  return (
    <main className="container px-4 py-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">Monitor infrastructure issues across India</p>
      </div>

      {/* SECTION 1: PERSONAL IMPACT (New Section) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">My Contribution</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="My Reports"
            value={userStats.total}
            icon={FileText}
            description="Issues you have flagged"
          />
          <StatsCard
            title="Impact Score"
            value={userStats.verified}
            icon={Trophy}
            description="Your reports verified by authorities"
          />
          <StatsCard
            title="Fixed Issues"
            value={userStats.resolved}
            icon={CheckCircle}
            description="Problems resolved thanks to you"
          />
        </div>
      </section>

      {/* SECTION 2: GLOBAL STATS (Existing) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Community Overview</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title={t.dashboard.totalReports}
            value={stats.totalReports}
            icon={FileText}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title={t.dashboard.verified}
            value={stats.verifiedReports}
            icon={CheckCircle}
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title={t.dashboard.resolved}
            value={stats.resolvedReports}
            icon={AlertTriangle}
            trend={{ value: 5, isPositive: true }}
          />
          <StatsCard
            title={t.dashboard.estimatedLoss}
            value={formatCurrency(stats.estimatedLoss)}
            icon={IndianRupee}
            description="Total estimated public loss"
          />
        </div>
      </section>

      {/* SECTION 3: CHARTS */}
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryChart categoryCounts={stats.categoryCounts} />
        <CityChart cityCounts={stats.cityCounts} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StatusChart reports={stats.recentReports} />
        <TrendChart reports={stats.recentReports} />
      </div>

      {/* SECTION 4: MY RECENT REPORTS LIST */}
      <section>
        <h2 className="text-xl font-semibold mb-4">My Recent Reports</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
        
        {userReports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            You haven't submitted any reports yet. 
            <br />
            Go to the "Capture" tab to report an issue!
          </div>
        )}
      </section>
    </main>
  )
}