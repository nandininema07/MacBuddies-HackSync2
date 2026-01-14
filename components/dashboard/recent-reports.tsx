import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"
import type { Report } from "@/lib/types"

interface RecentReportsProps {
  reports: Report[]
}

export function RecentReports({ reports }: RecentReportsProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evidence</TableHead>
            <TableHead>Issue Details</TableHead>
            <TableHead>Integrity Audit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              {/* Column 1: Evidence Thumbnail */}
              <TableCell>
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={report.image_url || ""} alt="Evidence" className="object-cover" />
                  <AvatarFallback className="rounded-lg">IMG</AvatarFallback>
                </Avatar>
              </TableCell>

              {/* Column 2: Issue Details */}
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium line-clamp-1">{report.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {report.category || "Uncategorized"} • {report.city || "Unknown"}
                  </span>
                </div>
              </TableCell>

              {/* Column 3: Audit Verdict (NEW) */}
              <TableCell>
                 <div className="flex items-center gap-2">
                    {report.matched_project_id ? (
                        report.risk_level === 'High' ? (
                            <Badge variant="destructive" className="gap-1 px-2">
                                <AlertTriangle className="h-3 w-3" /> Mismatch
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1 px-2 text-green-600 border-green-200 bg-green-50">
                                <CheckCircle className="h-3 w-3" /> Verified
                            </Badge>
                        )
                    ) : (
                        <Badge variant="secondary" className="text-xs">No Record</Badge>
                    )}
                 </div>
                 {/* Tooltip-like explanation */}
                 {report.audit_reasoning && (
                     <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] truncate" title={report.audit_reasoning}>
                        {report.audit_reasoning}
                     </p>
                 )}
              </TableCell>

              {/* Column 4: Status */}
              <TableCell>
                <div className="flex items-center gap-2">
                  {report.status === "verified" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {report.status === "in_progress" && <Clock className="h-4 w-4 text-blue-500" />}
                  {report.status === "pending" && <Clock className="h-4 w-4 text-gray-400" />}
                  <span className="capitalize text-sm">{report.status.replace("_", " ")}</span>
                </div>
              </TableCell>

              {/* Column 5: Date */}
              <TableCell className="text-right text-sm text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}