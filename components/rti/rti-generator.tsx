"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Report, GovernmentProject, RTIApplication } from "@/lib/types"
import type { User } from "@supabase/supabase-js"
import {
  FileText,
  AlertTriangle,
  Loader2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Save,
  Send,
  MapPin,
  Calendar,
  IndianRupee,
} from "lucide-react"

interface RTIGeneratorProps {
  user: User | null
  reports: Report[]
  projects: GovernmentProject[]
  onApplicationSaved: (app: RTIApplication) => void
}

type DocumentType = "rti" | "complaint"

const departments = [
  { value: "pwd", label: "Public Works Department" },
  { value: "municipal", label: "Municipal Corporation" },
  { value: "water", label: "Water Supply Department" },
  { value: "electrical", label: "Electricity Department" },
  { value: "general", label: "General" },
]

export function RTIGenerator({ user, reports, projects, onApplicationSaved }: RTIGeneratorProps) {
  const { t, language } = useI18n()
  const [documentType, setDocumentType] = useState<DocumentType>("rti")
  const [selectedReportId, setSelectedReportId] = useState<string>("")
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [department, setDepartment] = useState<string>("pwd") // Updated default value
  const [applicantName, setApplicantName] = useState("")
  const [applicantAddress, setApplicantAddress] = useState("")
  const [applicantPhone, setApplicantPhone] = useState("")
  const [additionalDetails, setAdditionalDetails] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [editedText, setEditedText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedReport = reports.find((r) => r.id === selectedReportId)
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  const handleGenerate = async () => {
    if (!selectedReportId || !department || !applicantName || !applicantAddress) {
      setError("Please fill in all required fields")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const endpoint = documentType === "rti" ? "/api/rti/generate" : "/api/complaint/generate"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReportId,
          projectId: selectedProjectId || undefined,
          department,
          templateType: department,
          applicantName,
          applicantAddress,
          applicantPhone,
          additionalDetails,
          language,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedText(data.generatedText)
        setEditedText(data.generatedText)
      } else {
        setError(data.error || "Failed to generate document")
      }
    } catch (err) {
      setError("An error occurred while generating the document")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async (status: "draft" | "submitted") => {
    if (!user) {
      setError("Please login to save your application")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: saveError } = await supabase
        .from("rti_applications")
        .insert({
          user_id: user.id,
          related_report_id: selectedReportId,
          related_project_id: selectedProjectId || null,
          template_type: department,
          department,
          generated_text: generatedText,
          user_edits: editedText !== generatedText ? editedText : null,
          submission_status: status,
          submission_date: status === "submitted" ? new Date().toISOString() : null,
        })
        .select("*, report:reports(*), project:government_projects(*)")
        .single()

      if (saveError) throw saveError

      if (data) {
        onApplicationSaved(data as RTIApplication)
        // Reset form
        setGeneratedText("")
        setEditedText("")
        setSelectedReportId("")
        setSelectedProjectId("")
      }
    } catch (err) {
      setError("Failed to save application")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedText || generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = editedText || generatedText
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${documentType === "rti" ? "RTI_Application" : "Complaint_Letter"}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {documentType === "rti" ? t.rti.generateRTI : t.rti.generateComplaint}
            </CardTitle>
            <CardDescription>Select the type of document and fill in the required details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type Toggle */}
            <Tabs value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rti">{t.rti.generateRTI}</TabsTrigger>
                <TabsTrigger value="complaint">{t.rti.generateComplaint}</TabsTrigger>
              </TabsList>
            </Tabs>

            <Separator />

            {/* Report Selection */}
            <div className="space-y-2">
              <Label>{t.rti.selectReport} *</Label>
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified report..." />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {report.category}
                        </Badge>
                        <span className="truncate max-w-[200px]">{report.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Report Details */}
            {selectedReport && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedReport.address || `${selectedReport.city}, ${selectedReport.state}`}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedReport.created_at).toLocaleDateString("en-IN")}
                  </div>
                  {selectedReport.estimated_cost && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      Est. Cost: ₹{selectedReport.estimated_cost.toLocaleString("en-IN")}
                    </div>
                  )}
                  <Badge
                    variant={selectedReport.severity === "critical" ? "destructive" : "secondary"}
                    className="mt-2"
                  >
                    {selectedReport.severity}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Project Selection (Optional for RTI) */}
            {documentType === "rti" && (
              <div className="space-y-2">
                <Label>{t.rti.selectProject}</Label>
                <Select
                  value={selectedProjectId || "none"}
                  onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link a government project (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{project.name}</span>
                          {project.budget && (
                            <Badge variant="outline" className="text-xs">
                              ₹{(project.budget / 10000000).toFixed(1)}Cr
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Department Selection */}
            <div className="space-y-2">
              <Label>{t.rti.selectDepartment} *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {t.rti.departments[dept.value as keyof typeof t.rti.departments] || dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Applicant Details */}
            <div className="space-y-4">
              <Label className="text-base font-medium">{t.rti.applicantDetails}</Label>

              <div className="space-y-2">
                <Label htmlFor="name">{t.rti.applicantName} *</Label>
                <Input
                  id="name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t.rti.applicantAddress} *</Label>
                <Textarea
                  id="address"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="Enter your complete address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.rti.applicantPhone}</Label>
                <Input
                  id="phone"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="additional">Additional Information (Optional)</Label>
              <Textarea
                id="additional"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Any additional information or specific requests..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.rti.generating}
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {documentType === "rti" ? t.rti.generateRTI : t.rti.generateComplaint}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t.rti.preview}</span>
              {generatedText && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleGenerate()}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t.rti.regenerate}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? t.rti.copied : t.rti.copyText}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedText ? (
              <div className="space-y-4">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Generated document will appear here..."
                />

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    {t.rti.download}
                  </Button>

                  {user && (
                    <>
                      <Button variant="secondary" onClick={() => handleSave("draft")} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {t.rti.save}
                      </Button>

                      <Button onClick={() => handleSave("submitted")} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {t.rti.submit}
                      </Button>
                    </>
                  )}
                </div>

                {!user && (
                  <Alert>
                    <AlertDescription>Login to save your applications and track their status.</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p>Fill in the form and click generate to create your document</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
