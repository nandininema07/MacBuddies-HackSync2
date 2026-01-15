"use client"

import { useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { 
  MapPin, 
  ThumbsUp, 
  Calendar, 
  Users,
  Loader2,
  List,
  Map as MapIcon,
  X,
  BrainCircuit, // New icon for AI
  AlertTriangle
} from "lucide-react"
import type { Report } from "@/lib/types"

const LeafletMap = dynamic(() => import("./leaflet-map"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Loading Map...
    </div>
  )
})

interface MapContentProps {
  reports: Report[]
  predictions?: any[] // New Prop
}

export function MapContent({ reports: initialReports, predictions = [] }: MapContentProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [showForecast, setShowForecast] = useState(false) // Toggle State
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [showMobileList, setShowMobileList] = useState(false)
  
  const supabase = createClient()

  const handleVote = async (reportId: string) => {
    const { data, error } = await supabase.rpc('toggle_vote', { report_id_input: reportId })
    if (error) return alert("Please log in to vote.")
    if (data && typeof data.count === 'number') {
      const updateReport = (list: Report[]) => 
        list.map(r => r.id === reportId ? { ...r, upvotes: data.count } : r)
      setReports(prev => updateReport(prev))
      setVisibleReports(prev => updateReport(prev))
    }
  }

  // --- LOGIC: SWITCH BETWEEN REAL DATA AND AI DATA ---
  const displaySource = useMemo(() => {
    return showForecast ? predictions : visibleReports
  }, [showForecast, predictions, visibleReports])

  const cityStats = useMemo(() => {
    const stats: Record<string, { count: number; highRisk: number; votes: number }> = {}

    displaySource.forEach((r) => {
      const city = r.city || "Unknown Region"
      if (!stats[city]) stats[city] = { count: 0, highRisk: 0, votes: 0 }
      
      stats[city].count += 1
      stats[city].votes += showForecast ? (r.prediction?.score || 0) : (r.upvotes || 0)

      const severity = showForecast 
        ? r.prediction?.label?.toLowerCase() 
        : r.severity?.toLowerCase() || ""

      if (severity === "high" || severity === "critical") {
        stats[city].highRisk += 1
      }
    })

    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [displaySource, showForecast])

  const handleViewChange = useCallback((visible: Report[], zoom: number) => {
    setVisibleReports(visible)
    setCurrentZoom(zoom)
  }, [])

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      
      <div className={`
          absolute inset-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-in-out
          md:static md:w-[400px] md:flex-shrink-0 md:translate-x-0 md:border-r md:shadow-xl md:z-auto
          ${showMobileList ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-card flex justify-between items-center">
            <div>
                <h2 className="font-bold text-xl flex items-center gap-2">
                    {showForecast ? <BrainCircuit className="h-5 w-5 text-purple-600" /> : <Users className="h-5 w-5 text-blue-600" />}
                    {showForecast ? "AI Risk Forecast" : "Community Voice"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                    {showForecast ? "Predicting infrastructure decay" : "Real-time citizen reports"}
                </p>
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMobileList(false)}><X /></Button>
        </div>

        {/* --- AI TOGGLE BUTTON --- */}
        <div className="p-3 px-4 bg-slate-100 border-b flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Analysis Mode</span>
            <Button 
                size="sm" 
                variant={showForecast ? "destructive" : "default"}
                className={`h-8 px-4 rounded-full text-xs transition-all ${showForecast ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                onClick={() => setShowForecast(!showForecast)}
            >
                {showForecast ? "Exit Forecast" : "View Future Forecast"}
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-24 md:pb-4">
          {displaySource.length === 0 ? <div className="text-center p-8 text-muted-foreground">No data in this view.</div> : (
            displaySource.map((item) => (
              <Card key={item.id} className={`overflow-hidden border-l-4 transition-all ${showForecast ? 'border-purple-500 shadow-purple-100' : ''}`}
                style={{ borderLeftColor: showForecast ? (item.prediction.score > 70 ? '#a855f7' : '#d8b4fe') : (item.severity === 'critical' ? '#ef4444' : '#22c55e') }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-base">{showForecast ? `[FORECAST] ${item.title}` : item.title}</h4>
                    <Badge className={showForecast ? "bg-purple-600" : ""}>
                        {showForecast ? item.prediction.label : item.severity}
                    </Badge>
                  </div>
                  
                  {showForecast && (
                    <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-100 text-[11px] text-purple-800 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5" />
                        <span>AI Prediction: High failure probability due to <b>{item.prediction.contractor}</b> history and monsoon decay.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {item.city}
                  </div>
                  
                  {!showForecast && (
                    <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-xs" onClick={() => handleVote(item.id)}>
                        <ThumbsUp className="h-3 w-3 mr-2" /> Support Petition
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 relative h-full w-full z-0">
        <LeafletMap 
          reports={reports} 
          predictions={predictions} 
          isForecastMode={showForecast} 
          onViewChange={handleViewChange} 
        />
      </div>
    </div>
  )
}