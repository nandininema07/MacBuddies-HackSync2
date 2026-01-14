"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import type { Petition } from "@/lib/types"
import { Users, TrendingUp, MapPin, CheckCircle, AlertTriangle } from "lucide-react"

interface PetitionCardProps {
  petition: Petition
  onUpdate: () => void
}

export function PetitionCard({ petition, onUpdate }: PetitionCardProps) {
  const { t } = useI18n()
  const [signing, setSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    checkSignatureStatus()
  }, [petition.id])

  const checkSignatureStatus = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      setUser(user.id)
      const { data } = await supabase
        .from("petition_signatures")
        .select("id")
        .eq("petition_id", petition.id)
        .eq("user_id", user.id)
        .single()

      setHasSigned(!!data)
    }
  }

  const handleSign = async () => {
    if (!user || hasSigned) return

    setSigning(true)
    const supabase = createClient()

    const { error } = await supabase.from("petition_signatures").insert({
      petition_id: petition.id,
      user_id: user,
      is_anonymous: false,
    })

    if (!error) {
      // Update signature count
      await supabase
        .from("petitions")
        .update({ signature_count: petition.signature_count + 1 })
        .eq("id", petition.id)

      setHasSigned(true)
      onUpdate()
    }

    setSigning(false)
  }

  const progress = (petition.signature_count / petition.target_signatures) * 100
  const isEscalated = petition.status === "escalated"
  const isAchieved = petition.status === "achieved"

  return (
    <Card className={`transition-all ${isEscalated ? "border-chart-1 border-2" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{petition.title}</CardTitle>
            {petition.geographic_area && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {petition.geographic_area}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1">
            {isEscalated && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t.community.escalated}
              </Badge>
            )}
            {isAchieved && (
              <Badge className="gap-1 bg-chart-2 text-chart-2-foreground">
                <CheckCircle className="h-3 w-3" />
                Achieved
              </Badge>
            )}
            {petition.trending_score > 50 && !isEscalated && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {t.community.trending}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{petition.description}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <Users className="h-4 w-4" />
              {petition.signature_count.toLocaleString()} {t.community.signatures}
            </span>
            <span className="text-muted-foreground">
              {t.community.targetSignatures}: {petition.target_signatures.toLocaleString()}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        {petition.affected_population > 0 && (
          <p className="text-xs text-muted-foreground">
            {t.community.affectedCitizens}: {petition.affected_population.toLocaleString()}
          </p>
        )}

        <Button
          onClick={handleSign}
          disabled={!user || hasSigned || signing || isAchieved}
          className="w-full"
          variant={hasSigned ? "secondary" : "default"}
        >
          {hasSigned ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t.community.signed}
            </>
          ) : (
            t.community.signPetition
          )}
        </Button>

        {!user && <p className="text-xs text-center text-muted-foreground">Login to sign this petition</p>}
      </CardContent>
    </Card>
  )
}
