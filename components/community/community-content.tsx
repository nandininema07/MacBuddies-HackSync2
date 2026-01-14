"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import type { Petition, GovernmentProject } from "@/lib/types"
import { PetitionCard } from "./petition-card"
import { ProjectCard } from "./project-card"
import { CreatePetitionDialog } from "./create-petition-dialog"
import { SubmitProjectDialog } from "./submit-project-dialog"
import { FileText, Building2, TrendingUp, Users, Plus } from "lucide-react"

export function CommunityContent() {
  const { t } = useI18n()
  const [petitions, setPetitions] = useState<Petition[]>([])
  const [projects, setProjects] = useState<GovernmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePetition, setShowCreatePetition] = useState(false)
  const [showSubmitProject, setShowSubmitProject] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [petitionsResult, projectsResult] = await Promise.all([
      supabase.from("petitions").select("*").order("total_score", { ascending: false }),
      supabase.from("government_projects").select("*").order("created_at", { ascending: false }),
    ])

    if (petitionsResult.data) setPetitions(petitionsResult.data)
    if (projectsResult.data) setProjects(projectsResult.data)
    setLoading(false)
  }

  const totalSignatures = petitions.reduce((sum, p) => sum + p.signature_count, 0)
  const escalatedCount = petitions.filter((p) => p.status === "escalated").length
  const verifiedProjects = projects.filter((p) => p.is_verified).length

  return (
    <main className="container px-4 py-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.community.title}</h1>
        <p className="text-muted-foreground">Join forces with fellow citizens to demand infrastructure improvements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{petitions.length}</p>
                <p className="text-sm text-muted-foreground">{t.community.petitions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-2/10">
                <Users className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSignatures.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t.community.signatures}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-1/10">
                <TrendingUp className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{escalatedCount}</p>
                <p className="text-sm text-muted-foreground">{t.community.escalated}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-3/10">
                <Building2 className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verifiedProjects}</p>
                <p className="text-sm text-muted-foreground">{t.community.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="petitions" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="petitions" className="gap-2">
              <FileText className="h-4 w-4" />
              {t.community.petitions}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t.community.projects}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreatePetition(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.community.createPetition}</span>
            </Button>
            <Button variant="outline" onClick={() => setShowSubmitProject(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.community.submitProject}</span>
            </Button>
          </div>
        </div>

        <TabsContent value="petitions" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-48" />
                </Card>
              ))}
            </div>
          ) : petitions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No petitions yet. Be the first to create one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {petitions.map((petition) => (
                <PetitionCard key={petition.id} petition={petition} onUpdate={fetchData} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-48" />
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects submitted yet. Help build the database!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onUpdate={fetchData} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreatePetitionDialog open={showCreatePetition} onOpenChange={setShowCreatePetition} onSuccess={fetchData} />
      <SubmitProjectDialog open={showSubmitProject} onOpenChange={setShowSubmitProject} onSuccess={fetchData} />
    </main>
  )
}
