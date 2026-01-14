"use client"

import type React from "react"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { RTIApplication } from "@/lib/types"
import type { User } from "@supabase/supabase-js"
import { FileText, Calendar, Building2, Eye, Download, Trash2, AlertTriangle } from "lucide-react"

interface RTIHistoryProps {
  user: User | null
  applications: RTIApplication[]
  setApplications: React.Dispatch<React.SetStateAction<RTIApplication[]>>
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  response_received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export function RTIHistory({ user, applications, setApplications }: RTIHistoryProps) {
  const { t } = useI18n()
  const [selectedApp, setSelectedApp] = useState<RTIApplication | null>(null)

  const handleStatusUpdate = async (appId: string, newStatus: RTIApplication["submission_status"]) => {
    const supabase = createClient()
    const updateData: Record<string, any> = {
      submission_status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === "submitted") {
      updateData.submission_date = new Date().toISOString()
    } else if (newStatus === "response_received") {
      updateData.response_received_date = new Date().toISOString()
    }

    const { error } = await supabase.from("rti_applications").update(updateData).eq("id", appId)

    if (!error) {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, ...updateData, submission_status: newStatus } : app)),
      )
    }
  }

  const handleDelete = async (appId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("rti_applications").delete().eq("id", appId)

    if (!error) {
      setApplications((prev) => prev.filter((app) => app.id !== appId))
    }
  }

  const handleDownload = (app: RTIApplication) => {
    const text = app.user_edits || app.generated_text
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `RTI_${app.department}_${new Date(app.created_at).toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Please login to view your application history.</AlertDescription>
      </Alert>
    )
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-50" />
          <p>{t.rti.noApplications}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t.rti.departments[app.department as keyof typeof t.rti.departments] || app.department}
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(app.created_at).toLocaleDateString("en-IN")}
                  </span>
                  {app.tracking_number && <span>#{app.tracking_number}</span>}
                </CardDescription>
              </div>
              <Badge className={statusColors[app.submission_status]}>
                {t.rti.status[app.submission_status as keyof typeof t.rti.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Related Report Info */}
            {app.report && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Related Report:</span> {app.report.title}
                <Badge variant="outline" className="ml-2 text-xs">
                  {app.report.category}
                </Badge>
              </div>
            )}

            {/* Status Update */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={app.submission_status}
                onValueChange={(value) => handleStatusUpdate(app.id, value as RTIApplication["submission_status"])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t.rti.status.draft}</SelectItem>
                  <SelectItem value="submitted">{t.rti.status.submitted}</SelectItem>
                  <SelectItem value="response_received">{t.rti.status.response_received}</SelectItem>
                  <SelectItem value="closed">{t.rti.status.closed}</SelectItem>
                </SelectContent>
              </Select>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                    <Eye className="h-4 w-4 mr-1" />
                    {t.rti.viewDetails}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>RTI Application Details</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    value={app.user_edits || app.generated_text}
                    readOnly
                    className="min-h-[400px] font-mono text-sm"
                  />
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={() => handleDownload(app)}>
                <Download className="h-4 w-4 mr-1" />
                {t.rti.download}
              </Button>

              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(app.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
