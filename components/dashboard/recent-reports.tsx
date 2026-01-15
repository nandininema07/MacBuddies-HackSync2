import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import type { Report } from "@/lib/types"
import Link from "next/link"

interface RecentReportsProps {
  reports: Report[]
}

export function RecentReports({ reports }: RecentReportsProps) {
  if (!reports || reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg bg-slate-50 border-dashed">
        <p className="text-muted-foreground text-sm">No audits recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Link 
            key={report.id} 
            href={`/dashboard?focus=${report.id}`}
            className="block group"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-blue-200">
            
            {/* 1. Evidence Thumbnail */}
            <div className="relative h-16 w-16 sm:h-12 sm:w-12 flex-shrink-0 overflow-hidden rounded-md border bg-slate-100">
                {report.image_url ? (
                <img
                    src={report.image_url}
                    alt={report.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
                ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                    <AlertTriangle className="h-5 w-5" />
                </div>
                )}
            </div>

            {/* 2. Main Details */}
            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <p className="font-semibold leading-none group-hover:text-blue-700 transition-colors">
                        {report.title || "Untitled Report"}
                    </p>
                    {/* Mobile Date (Visible only on tiny screens if needed, otherwise hidden) */}
                    <span className="sm:hidden text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                    </span>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground gap-3">
                    <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                            {report.address || report.city || "Mumbai, India"}
                        </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* 3. Status & Severity Badges */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                
                {/* Severity Badge */}
                <Badge variant="outline" className={`
                    ${report.risk_level === 'High' || report.risk_level === 'Critical' ? 'border-red-200 bg-red-50 text-red-700' :
                      report.risk_level === 'Medium' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                      'border-green-200 bg-green-50 text-green-700'}
                `}>
                    {report.risk_level || "Unknown"} Risk
                </Badge>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5 text-xs font-medium">
                    {report.status === 'verified' ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> Pending
                        </span>
                    )}
                </div>
            </div>

            </div>
        </Link>
      ))}
    </div>
  )
}