"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import type { Petition, GovernmentProject, Report } from "@/lib/types"
import { PetitionCard } from "./petition-card"
import { ProjectCard } from "./project-card"
import { CreatePetitionDialog } from "./create-petition-dialog"
import { SubmitProjectDialog } from "./submit-project-dialog"

import { 
  FileText, 
  Building2, 
  TrendingUp, 
  Users, 
  Plus, 
  AlertTriangle, 
  PenSquare
} from "lucide-react"
import { SocialReportCard } from "./SocialReportCard"

export function CommunityContent() {
  const { t } = useI18n()
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [projects, setProjects] = useState<GovernmentProject[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePetition, setShowCreatePetition] = useState(false)
  const [showSubmitProject, setShowSubmitProject] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [petitionsResult, projectsResult, reportsResult] = await Promise.all([
      supabase.from("petitions").select("*").order("total_score", { ascending: false }),
      supabase.from("government_projects").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(20),
    ])

    if (petitionsResult.data) setPetitions(petitionsResult.data)
    if (projectsResult.data) setProjects(projectsResult.data)
    if (reportsResult.data) setReports(reportsResult.data)
    setLoading(false)
  }

  const totalSignatures = petitions.reduce((sum, p) => sum + p.signature_count, 0)
  const escalatedCount = petitions.filter((p) => p.status === "escalated").length
  const verifiedProjects = projects.filter((p) => p.is_verified).length

  return (
    <main className="container max-w-7xl px-4 py-6">
      
      {/* LAYOUT GRID: Swapped Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === LEFT COLUMN: STATS SIDEBAR (Desktop) === */}
        {/* Moved this block to the top so it appears on the left in the grid */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="sticky top-24">
            
            {/* Community Info Card */}
            <Card className="overflow-hidden border-none shadow-lg mb-6">
               <div className="h-12 bg-primary/90"></div>
               <CardContent className="pt-0 relative">
                  <div className="h-16 w-16 bg-background rounded-full absolute -top-8 p-1">
                     <div className="h-full w-full bg-slate-100 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-slate-400" />
                     </div>
                  </div>
                  <div className="mt-10">
                     <h2 className="text-xl font-bold">{t.community.title}</h2>
                     <p className="text-sm text-muted-foreground mt-2 mb-4">
                       Join forces with fellow citizens to demand infrastructure improvements and track government projects.
                     </p>
                     
                     <div className="grid grid-cols-1 gap-2">
                        <Button className="w-full justify-start" onClick={() => setShowCreatePetition(true)}>
                           <Plus className="h-4 w-4 mr-2" />
                           {t.community.createPetition}
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => setShowSubmitProject(true)}>
                           <Building2 className="h-4 w-4 mr-2" />
                           {t.community.submitProject}
                        </Button>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* Stats Sidebar */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Community Stats</h3>
              
              <StatsRow 
                icon={FileText} 
                color="text-primary" 
                bg="bg-primary/10" 
                value={petitions.length} 
                label={t.community.petitions} 
              />
              <StatsRow 
                icon={Users} 
                color="text-chart-2" 
                bg="bg-chart-2/10" 
                value={totalSignatures.toLocaleString()} 
                label={t.community.signatures} 
              />
              <StatsRow 
                icon={TrendingUp} 
                color="text-chart-1" 
                bg="bg-chart-1/10" 
                value={escalatedCount} 
                label={t.community.escalated} 
              />
              <StatsRow 
                icon={Building2} 
                color="text-chart-3" 
                bg="bg-chart-3/10" 
                value={verifiedProjects} 
                label={t.community.verified} 
              />
            </div>

            {/* Footer Links */}
            <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground px-2">
               <a href="#" className="hover:underline">About</a>
               <a href="#" className="hover:underline">Rules</a>
               <a href="#" className="hover:underline">Privacy</a>
               <p>© 2026 Civil Connect</p>
            </div>

          </div>
        </div>

        {/* === RIGHT COLUMN: MAIN FEED === */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Header & Mobile Stats (Visible only on mobile) */}
          <div className="lg:hidden mb-6">
             <h1 className="text-3xl font-bold tracking-tight mb-2">{t.community.title}</h1>
             <p className="text-muted-foreground mb-4">Join forces with fellow citizens.</p>
             {/* Simplified Mobile Stats Row */}
             <div className="grid grid-cols-2 gap-2">
                <Card className="bg-muted/50">
                   <CardContent className="p-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-bold">{petitions.length}</span>
                   </CardContent>
                </Card>
                <Card className="bg-muted/50">
                   <CardContent className="p-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-chart-2" />
                      <span className="font-bold">{totalSignatures}</span>
                   </CardContent>
                </Card>
             </div>
          </div>

          <Tabs defaultValue="petitions" className="w-full">
            
            {/* 2. Sticky Navigation Bar & Create Post Input */}
            <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 border-b mb-6">
               
               {/* "Create Post" Fake Input (Reddit Style) */}
               <div className="flex items-center gap-3 mb-4 bg-muted/30 p-2 rounded-md border border-border/50">
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                  <div 
                    onClick={() => setShowCreatePetition(true)}
                    className="flex-1 bg-background hover:bg-accent/50 transition-colors border rounded-md h-9 px-4 flex items-center text-sm text-muted-foreground cursor-pointer"
                  >
                    Create a petition or project...
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setShowCreatePetition(true)}>
                    <PenSquare className="h-5 w-5 text-muted-foreground" />
                  </Button>
               </div>

               {/* Tab Triggers - MODIFIED FOR "PILL" LOOK */}
               <div className="flex items-center justify-between">
                <TabsList className="bg-transparent p-0 h-auto w-full justify-start space-x-2">
                  <TabsTrigger 
                    value="petitions" 
                    className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all 
                    data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 
                    data-[state=active]:text-foreground hover:text-foreground hover:bg-muted/50
                    border border-transparent"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {t.community.petitions}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="projects" 
                    className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all 
                    data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 
                    data-[state=active]:text-foreground hover:text-foreground hover:bg-muted/50
                    border border-transparent"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {t.community.projects}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="reports" 
                    className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all 
                    data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 
                    data-[state=active]:text-foreground hover:text-foreground hover:bg-muted/50
                    border border-transparent"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t.dashboard?.recentReports || "Reports"}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* 3. Feed Content (Single Column Stacks) */}
            <div className="max-w-2xl mx-auto">
              
              <TabsContent value="petitions" className="mt-0 space-y-4">
                {loading ? (
                  [1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse" />)
                ) : petitions.length === 0 ? (
                  <EmptyState icon={FileText} text="No petitions yet." />
                ) : (
                  // Force Stack Layout
                  petitions.map((petition) => (
                    <div key={petition.id} className="w-full">
                      <PetitionCard petition={petition} onUpdate={fetchData} />
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-0 space-y-4">
                {loading ? (
                  [1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse" />)
                ) : projects.length === 0 ? (
                  <EmptyState icon={Building2} text="No projects yet." />
                ) : (
                  // Force Stack Layout
                  projects.map((project) => (
                    <div key={project.id} className="w-full">
                      <ProjectCard project={project} onUpdate={fetchData} />
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                {loading ? (
                  // LOADING STATE: Single Column Skeletons (Feed Style)
                  <div className="max-w-2xl mx-auto space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="h-48" />
                      </Card>
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  // EMPTY STATE
                  <div className="max-w-2xl mx-auto">
                    <Card>
                      <CardContent className="pt-6 text-center py-16">
                        <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                           <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No reports yet</h3>
                        <p className="text-muted-foreground text-sm">Be the first to report an issue in your area.</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  // DATA STATE: Feed Layout (No Grid)
                  <div className="max-w-2xl mx-auto pb-10">
                    {reports.map((report) => (
                      <SocialReportCard key={report.id} report={report} />
                    ))}
                    
                    {/* "End of Feed" Indicator */}
                    <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                      <div className="flex gap-1 opacity-50">
                         <div className="h-1.5 w-1.5 bg-current rounded-full" />
                         <div className="h-1.5 w-1.5 bg-current rounded-full" />
                         <div className="h-1.5 w-1.5 bg-current rounded-full" />
                      </div>
                      <span>You've reached the end of the list</span>
                    </div>
                  </div>
                )}
              </TabsContent>
              
            </div>
          </Tabs>
        </div>

      </div>

      <CreatePetitionDialog open={showCreatePetition} onOpenChange={setShowCreatePetition} onSuccess={fetchData} />
      <SubmitProjectDialog open={showSubmitProject} onOpenChange={setShowSubmitProject} onSuccess={fetchData} />
    </main>
  )
}

// --- Helper Components ---

function StatsRow({ icon: Icon, color, bg, value, label }: any) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: 'currentColor' }}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className={`p-2 rounded-md ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
           </div>
           <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-lg font-bold">{value}</span>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, text }: any) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="pt-6 text-center py-12">
        <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}