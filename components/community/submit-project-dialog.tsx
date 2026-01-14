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

interface SubmitProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SubmitProjectDialog({ open, onOpenChange, onSuccess }: SubmitProjectDialogProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    budget: "",
    department: "",
    contractor_name: "",
    city: "",
    state: "",
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

    const { error } = await supabase.from("government_projects").insert({
      submitted_by: user.id,
      name: formData.name,
      description: formData.description || null,
      budget: formData.budget ? Number.parseFloat(formData.budget) : null,
      department: formData.department || null,
      contractor_name: formData.contractor_name || null,
      city: formData.city || null,
      state: formData.state || null,
      status: "pending",
      is_verified: false,
    })

    if (!error) {
      setFormData({
        name: "",
        description: "",
        budget: "",
        department: "",
        contractor_name: "",
        city: "",
        state: "",
      })
      onOpenChange(false)
      onSuccess()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.community.submitProject}</DialogTitle>
          <DialogDescription>Submit a government project to help build the infrastructure database</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.community.projectName}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Smart City Road Development Phase 2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project scope and objectives..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">{t.community.projectBudget}</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., 45000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t.community.department}</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Urban Development"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractor">{t.community.contractor}</Label>
            <Input
              id="contractor"
              value={formData.contractor_name}
              onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
              placeholder="e.g., L&T Construction"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t.community.projectCity}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Pune"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t.community.projectState}</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g., Maharashtra"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.community.submitProject}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
