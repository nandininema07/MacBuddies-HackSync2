"use client"

import { useState, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/lib/i18n/context"
import type { Report, PredictiveRisk } from "@/lib/types"
import { Filter, Layers, MapPin, ThumbsUp, Clock, X, Brain, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Dynamic import for Leaflet (client-side only)
const MapContainer = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-12rem)] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
})

interface MapContentProps {
  reports: Report[]
}

const severityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

const statusColors = {
  pending: "bg-slate-100 text-slate-800",
  verified: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

const riskLabelColors = {
  SAFE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MODERATE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function MapContent({ reports }: MapContentProps) {
  const { t } = useI18n()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedPrediction, setSelectedPrediction] = useState<PredictiveRisk | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers")
  const [showFilters, setShowFilters] = useState(false)
  const [isForecastMode, setIsForecastMode] = useState(false)
  const [predictions, setPredictions] = useState<PredictiveRisk[]>([])
  const [loadingPredictions, setLoadingPredictions] = useState(false)

  useEffect(() => {
    if (isForecastMode && predictions.length === 0) {
      setLoadingPredictions(true)
      fetch("/api/predict-risk")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPredictions(data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPredictions(false))
    }
  }, [isForecastMode, predictions.length])

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (categoryFilter !== "all" && report.category !== categoryFilter) return false
      if (severityFilter !== "all" && report.severity !== severityFilter) return false
      if (statusFilter !== "all" && report.status !== statusFilter) return false
      return true
    })
  }, [reports, categoryFilter, severityFilter, statusFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = filteredReports.length
    const critical = filteredReports.filter((r) => r.severity === "critical").length
    const totalLoss = filteredReports.reduce((sum, r) => sum + (r.estimated_cost || 0), 0)
    return { total, critical, totalLoss }
  }, [filteredReports])

  const predictionStats = useMemo(() => {
    const criticalCount = predictions.filter((p) => p.prediction.risk_label === "CRITICAL").length
    const moderateCount = predictions.filter((p) => p.prediction.risk_label === "MODERATE").length
    const safeCount = predictions.filter((p) => p.prediction.risk_label === "SAFE").length
    return { criticalCount, moderateCount, safeCount, total: predictions.length }
  }, [predictions])

  const clearFilters = () => {
    setCategoryFilter("all")
    setSeverityFilter("all")
    setStatusFilter("all")
  }

  const hasActiveFilters = categoryFilter !== "all" || severityFilter !== "all" || statusFilter !== "all"

  return (
    <main className="container px-4 py-6">
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.map.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isForecastMode
              ? `Showing ${predictions.length} infrastructure risk predictions`
              : `Showing ${filteredReports.length} of ${reports.length} reports`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
            <Brain className="h-4 w-4 text-purple-500" />
            <Label htmlFor="forecast-mode" className="text-sm font-medium cursor-pointer">
              {t.map.forecast}
            </Label>
            <Switch
              id="forecast-mode"
              checked={isForecastMode}
              onCheckedChange={setIsForecastMode}
              className="data-[state=checked]:bg-purple-500"
            />
          </div>

          {/* View Mode Toggle - only show when not in forecast mode */}
          {!isForecastMode && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === "markers" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("markers")}
                className="rounded-none"
              >
                <MapPin className="h-4 w-4 mr-1" />
                {t.map.clusters}
              </Button>
              <Button
                variant={viewMode === "heatmap" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("heatmap")}
                className="rounded-none"
              >
                <Layers className="h-4 w-4 mr-1" />
                {t.map.heatmap}
              </Button>
            </div>
          )}

          {/* Filter Button - only show when not in forecast mode */}
          {!isForecastMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1 bg-transparent"
            >
              <Filter className="h-4 w-4" />
              {t.map.filters}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel - only show when not in forecast mode */}
      {showFilters && !isForecastMode && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="road">{t.categories.road}</SelectItem>
                    <SelectItem value="bridge">{t.categories.bridge}</SelectItem>
                    <SelectItem value="building">{t.categories.building}</SelectItem>
                    <SelectItem value="drainage">{t.categories.drainage}</SelectItem>
                    <SelectItem value="electrical">{t.categories.electrical}</SelectItem>
                    <SelectItem value="water">{t.categories.water}</SelectItem>
                    <SelectItem value="other">{t.categories.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Severity</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="low">{t.severity.low}</SelectItem>
                    <SelectItem value="medium">{t.severity.medium}</SelectItem>
                    <SelectItem value="high">{t.severity.high}</SelectItem>
                    <SelectItem value="critical">{t.severity.critical}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">{t.status.pending}</SelectItem>
                    <SelectItem value="verified">{t.status.verified}</SelectItem>
                    <SelectItem value="in_progress">{t.status.in_progress}</SelectItem>
                    <SelectItem value="resolved">{t.status.resolved}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Bar - different stats for forecast mode */}
      {isForecastMode ? (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{predictionStats.total}</div>
              <div className="text-xs text-muted-foreground">Projects Analyzed</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-red-600">{predictionStats.criticalCount}</div>
              <div className="text-xs text-muted-foreground">{t.map.critical}</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{predictionStats.moderateCount}</div>
              <div className="text-xs text-muted-foreground">{t.map.moderate}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-600">{predictionStats.safeCount}</div>
              <div className="text-xs text-muted-foreground">{t.map.safe}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Reports</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold">
                ₹
                {stats.totalLoss >= 10000000
                  ? `${(stats.totalLoss / 10000000).toFixed(1)}Cr`
                  : `${(stats.totalLoss / 100000).toFixed(1)}L`}
              </div>
              <div className="text-xs text-muted-foreground">Est. Loss</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          {loadingPredictions && isForecastMode ? (
            <div className="h-[calc(100vh-16rem)] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Brain className="h-8 w-8 text-purple-500 animate-pulse mx-auto mb-2" />
                <span className="text-muted-foreground">Calculating risk predictions...</span>
              </div>
            </div>
          ) : (
            <MapContainer
              reports={filteredReports}
              viewMode={isForecastMode ? "forecast" : viewMode}
              onSelectReport={setSelectedReport}
              predictions={predictions}
              onSelectPrediction={setSelectedPrediction}
            />
          )}
        </CardContent>
      </Card>

      {/* Report Detail Sheet */}
      <Sheet open={!!selectedReport && !isForecastMode} onOpenChange={() => setSelectedReport(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedReport && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedReport.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex gap-2">
                  <Badge className={severityColors[selectedReport.severity]}>
                    {t.severity[selectedReport.severity]}
                  </Badge>
                  <Badge className={statusColors[selectedReport.status]}>{t.status[selectedReport.status]}</Badge>
                </div>

                {selectedReport.description && (
                  <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedReport.city || selectedReport.address || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedReport.upvotes} upvotes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDistanceToNow(new Date(selectedReport.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {selectedReport.estimated_cost && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Estimated Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        ₹{selectedReport.estimated_cost.toLocaleString("en-IN")}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedReport.department && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Responsible Department</h4>
                    <p className="text-sm text-muted-foreground">{selectedReport.department}</p>
                  </div>
                )}

                {selectedReport.ai_classification && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">AI Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>Confidence: {((selectedReport.ai_confidence || 0) * 100).toFixed(0)}%</div>
                      {selectedReport.ai_classification.issues_detected && (
                        <div>
                          <span className="text-muted-foreground">Issues:</span>
                          <ul className="list-disc list-inside">
                            {selectedReport.ai_classification.issues_detected.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedPrediction && isForecastMode} onOpenChange={() => setSelectedPrediction(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedPrediction && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  {t.map.riskPrediction}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-lg">{selectedPrediction.project_name}</h3>

                <div className="flex items-center gap-2">
                  <Badge className={riskLabelColors[selectedPrediction.prediction.risk_label]}>
                    {selectedPrediction.prediction.risk_label === "CRITICAL"
                      ? t.map.critical
                      : selectedPrediction.prediction.risk_label === "MODERATE"
                        ? t.map.moderate
                        : t.map.safe}
                  </Badge>
                  <span className="text-2xl font-bold">{selectedPrediction.prediction.predicted_risk}%</span>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">{t.map.predictedRisk}</h4>
                  <Progress value={selectedPrediction.prediction.predicted_risk} className="h-3" />
                </div>

                <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-purple-600" />
                      {t.map.forecastReason}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedPrediction.prediction.forecast_reason}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.map.factors}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t.map.ageFactor}</span>
                        <span>{selectedPrediction.prediction.factors.age_factor}/30</span>
                      </div>
                      <Progress value={(selectedPrediction.prediction.factors.age_factor / 30) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t.map.clusterFactor}</span>
                        <span>{selectedPrediction.prediction.factors.cluster_factor}/40</span>
                      </div>
                      <Progress
                        value={(selectedPrediction.prediction.factors.cluster_factor / 40) * 100}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t.map.contractorFactor}</span>
                        <span>{selectedPrediction.prediction.factors.contractor_factor}/30</span>
                      </div>
                      <Progress
                        value={(selectedPrediction.prediction.factors.contractor_factor / 30) * 100}
                        className="h-2"
                      />
                    </div>
                    {selectedPrediction.prediction.factors.seasonal_multiplier > 1 && (
                      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 p-2 rounded">
                        <AlertTriangle className="h-4 w-4" />
                        {t.map.seasonalMultiplier}: {selectedPrediction.prediction.factors.seasonal_multiplier}x
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}
