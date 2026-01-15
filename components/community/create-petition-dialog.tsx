"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface CreatePetitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreatePetitionDialog({ open, onOpenChange, onSuccess }: CreatePetitionDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    geographic_area: "",
    target_signatures: 1000,
    affected_population: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from("petitions").insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      geographic_area: formData.geographic_area || null,
      target_signatures: formData.target_signatures,
      affected_population: formData.affected_population,
      status: "active",
    })

    if (!error) {
      setFormData({
        title: "",
        description: "",
        geographic_area: "",
        target_signatures: 1000,
        affected_population: 0,
      })
      onOpenChange(false)
      onSuccess()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[150]">
        <DialogHeader>
          <DialogTitle>{t.community.createPetition}</DialogTitle>
          <DialogDescription>
            Create a petition to mobilize community support for an infrastructure issue
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t.community.petitionTitle}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fix Dangerous Potholes on Main Road"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.community.petitionDescription}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the issue in detail and explain why it needs attention..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Location / Area</Label>
              <Input
                id="area"
                value={formData.geographic_area}
                onChange={(e) => setFormData({ ...formData, geographic_area: e.target.value })}
                placeholder="e.g., Mumbai, Maharashtra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">{t.community.targetGoal}</Label>
              <Input
                id="target"
                type="number"
                min={100}
                max={100000}
                value={formData.target_signatures}
                onChange={(e) =>
                  setFormData({ ...formData, target_signatures: Number.parseInt(e.target.value) || 1000 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="population">{t.community.affectedCitizens}</Label>
            <Input
              id="population"
              type="number"
              min={0}
              value={formData.affected_population}
              onChange={(e) => setFormData({ ...formData, affected_population: Number.parseInt(e.target.value) || 0 })}
              placeholder="Estimated number of affected citizens"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.community.createPetition}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
