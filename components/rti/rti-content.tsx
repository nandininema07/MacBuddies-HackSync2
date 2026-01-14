"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RTIGenerator } from "./rti-generator"
import { RTIHistory } from "./rti-history"
import type { Report, GovernmentProject, RTIApplication } from "@/lib/types"
import type { User } from "@supabase/supabase-js"
import { FileText, History } from "lucide-react"

export function RTIContent() {
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [projects, setProjects] = useState<GovernmentProject[]>([])
  const [applications, setApplications] = useState<RTIApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Fetch reports (verified ones for RTI)
    supabase
      .from("reports")
      .select("*")
      .in("status", ["verified", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setReports(data)
      })

    // Fetch verified government projects
    supabase
      .from("government_projects")
      .select("*")
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setProjects(data)
      })

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    // Fetch user's RTI applications
    supabase
      .from("rti_applications")
      .select("*, report:reports(*), project:government_projects(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setApplications(data as RTIApplication[])
      })
  }, [user])

  const handleApplicationSaved = (newApp: RTIApplication) => {
    setApplications((prev) => [newApp, ...prev])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.rti.pageTitle}</h1>
        <p className="text-muted-foreground mt-2">
          Generate formal RTI applications and complaint letters using AI assistance
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.rti.tabs.generate}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t.rti.tabs.history}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <RTIGenerator user={user} reports={reports} projects={projects} onApplicationSaved={handleApplicationSaved} />
        </TabsContent>

        <TabsContent value="history">
          <RTIHistory user={user} applications={applications} setApplications={setApplications} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
