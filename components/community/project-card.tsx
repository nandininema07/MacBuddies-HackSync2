"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import type { GovernmentProject } from "@/lib/types"
import { MapPin, ThumbsUp, ThumbsDown, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface ProjectCardProps {
  project: GovernmentProject
  onUpdate: () => void
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const { t } = useI18n()
  const [voting, setVoting] = useState(false)
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    checkVoteStatus()
  }, [project.id])

  const checkVoteStatus = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUser(user.id)
      const { data } = await supabase
        .from("project_votes")
        .select("vote_type")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .single()

      if (data) setUserVote(data.vote_type as "up" | "down")
    }
  }

  const handleVote = async (voteType: "up" | "down") => {
    if (!user || voting) return

    setVoting(true)
    const supabase = createClient()

    if (userVote === voteType) {
      // Remove vote
      await supabase.from("project_votes").delete().eq("project_id", project.id).eq("user_id", user)

      const updateField = voteType === "up" ? "community_votes_up" : "community_votes_down"
      const currentValue = voteType === "up" ? project.community_votes_up : project.community_votes_down

      await supabase
        .from("government_projects")
        .update({ [updateField]: Math.max(0, currentValue - 1) })
        .eq("id", project.id)

      setUserVote(null)
    } else {
      // Add or change vote
      if (userVote) {
        // Remove old vote count
        const oldField = userVote === "up" ? "community_votes_up" : "community_votes_down"
        const oldValue = userVote === "up" ? project.community_votes_up : project.community_votes_down
        await supabase
          .from("government_projects")
          .update({ [oldField]: Math.max(0, oldValue - 1) })
          .eq("id", project.id)
      }

      await supabase.from("project_votes").upsert({
        project_id: project.id,
        user_id: user,
        vote_type: voteType,
      })

      const newField = voteType === "up" ? "community_votes_up" : "community_votes_down"
      const newValue = voteType === "up" ? project.community_votes_up : project.community_votes_down

      await supabase
        .from("government_projects")
        .update({ [newField]: newValue + 1 })
        .eq("id", project.id)

      setUserVote(voteType)
    }

    setVoting(false)
    onUpdate()
  }

  const statusConfig = {
    verified: {
      icon: CheckCircle,
      label: t.community.verified,
      variant: "default" as const,
      className: "bg-chart-2 text-white",
    },
    pending: { icon: Clock, label: t.community.pending, variant: "secondary" as const, className: "" },
    disputed: { icon: AlertCircle, label: t.community.disputed, variant: "destructive" as const, className: "" },
    rejected: { icon: AlertCircle, label: "Rejected", variant: "destructive" as const, className: "" },
  }

  const status = statusConfig[project.status]
  const StatusIcon = status.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
            {project.city && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {project.city}, {project.state}
              </CardDescription>
            )}
          </div>
          <Badge variant={status.variant} className={`gap-1 ${status.className}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}

        <div className="grid grid-cols-2 gap-2 text-sm">
          {project.budget && (
            <div>
              <p className="text-muted-foreground">{t.community.budget}</p>
              <p className="font-medium">₹{(project.budget / 10000000).toFixed(1)} Cr</p>
            </div>
          )}
          {project.department && (
            <div>
              <p className="text-muted-foreground">{t.community.department}</p>
              <p className="font-medium text-xs">{project.department}</p>
            </div>
          )}
          {project.contractor_name && (
            <div className="col-span-2">
              <p className="text-muted-foreground">{t.community.contractor}</p>
              <p className="font-medium text-xs">{project.contractor_name}</p>
            </div>
          )}
        </div>

        {project.verification_source && (
          <p className="text-xs text-muted-foreground">Source: {project.verification_source}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={userVote === "up" ? "default" : "outline"}
            onClick={() => handleVote("up")}
            disabled={!user || voting}
            className="flex-1 gap-1"
          >
            <ThumbsUp className="h-4 w-4" />
            {project.community_votes_up}
          </Button>
          <Button
            size="sm"
            variant={userVote === "down" ? "destructive" : "outline"}
            onClick={() => handleVote("down")}
            disabled={!user || voting}
            className="flex-1 gap-1"
          >
            <ThumbsDown className="h-4 w-4" />
            {project.community_votes_down}
          </Button>
        </div>

        {!user && <p className="text-xs text-center text-muted-foreground">Login to vote on this project</p>}
      </CardContent>
    </Card>
  )
}
