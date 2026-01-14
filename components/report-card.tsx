"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"
import type { Report } from "@/lib/types"
import { MapPin, ThumbsUp, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ReportCardProps {
  report: Report
  onClick?: () => void
}

const severityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const statusColors = {
  pending: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const { t } = useI18n()

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">{report.title}</h3>
          <Badge className={severityColors[report.severity]} variant="secondary">
            {t.severity[report.severity]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.description && <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{report.city || report.address || "Unknown Location"}</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={statusColors[report.status]} variant="secondary">
            {t.status[report.status]}
          </Badge>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{report.upvotes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {report.estimated_cost && (
          <div className="text-sm font-medium text-destructive">
            Est. Loss: {t.common.rupees}
            {report.estimated_cost.toLocaleString("en-IN")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
