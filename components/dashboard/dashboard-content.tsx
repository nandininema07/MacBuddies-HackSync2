"use client"

import { StatsCard } from "@/components/stats-card"
import { ReportCard } from "@/components/report-card"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { CityChart } from "@/components/dashboard/city-chart"
import { StatusChart } from "@/components/dashboard/status-chart"
import { TrendChart } from "@/components/dashboard/trend-chart"
import { useI18n } from "@/lib/i18n/context"
import type { DashboardStats } from "@/lib/types"
import { FileText, CheckCircle, AlertTriangle, IndianRupee } from "lucide-react"

interface DashboardContentProps {
  stats: DashboardStats
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const { t } = useI18n()

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    }
    return `₹${amount.toLocaleString("en-IN")}`
  }

  return (
    <main className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">Monitor infrastructure issues across India</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <CategoryChart categoryCounts={stats.categoryCounts} />
        <CityChart cityCounts={stats.cityCounts} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <StatusChart reports={stats.recentReports} />
        <TrendChart reports={stats.recentReports} />
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t.dashboard.recentReports}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.recentReports.slice(0, 6).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
        {stats.recentReports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No reports yet. Be the first to report an infrastructure issue!
          </div>
        )}
      </div>
    </main>
  )
}
