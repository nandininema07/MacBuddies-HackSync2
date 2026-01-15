"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/stats-card"
import { RecentReports } from "@/components/dashboard/recent-reports"
import { RankingList } from "@/components/dashboard/ranking-list" // Make sure this import is correct
import { useI18n } from "@/lib/i18n/context"
import type { DashboardStats, Report } from "@/lib/types"
import { FileText, CheckCircle, AlertTriangle, IndianRupee, Trophy, Activity } from "lucide-react"

interface DashboardContentProps {
  stats: DashboardStats
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const { t } = useI18n()
  const [userReports, setUserReports] = useState<Report[]>([])
  
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      if (data) setUserReports(data as Report[])
    }
    fetchUserData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumSignificantDigits: 3 }).format(amount)
  }

  return (
    <main className="container px-4 py-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
           <Activity className="h-4 w-4 text-green-500" />
           Live System Status
        </div>
      </div>

      {/* 2. Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title={t.dashboard.totalReports} value={stats.totalReports} icon={FileText} description="Reports submitted" />
        <StatsCard title={t.dashboard.verifiedReports} value={stats.verifiedReports} icon={CheckCircle} description="Verified by AI" />
        <StatsCard title="Discrepancies" value={stats.topRisks ? stats.topRisks.filter(r => r.risk_level === 'High').length : 0} icon={AlertTriangle} trend={{ value: 12, isPositive: false }} />
        <StatsCard title={t.dashboard.estimatedLoss} value={formatCurrency(stats.estimatedLoss)} icon={IndianRupee} description="Public fund risk" />
      </div>

      {/* 3. Main Content Grid (Layout Change) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (2/3 Width): Recent Table */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Audits</h2>
           </div>
           <RecentReports reports={stats.recentReports} />
        </div>

        {/* RIGHT COLUMN (1/3 Width): Live Rankings */}
        <div className="lg:col-span-1">
           <RankingList topRisks={stats.topRisks || []} />
        </div>

      </div>
    </main>
  )
}