"use client"

import { useState, useMemo, useCallback } from "react" // Added useCallback
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { 
  MapPin, 
  ThumbsUp, 
  Calendar, 
  Users,
  Loader2,
  ShieldCheck,
  List,
  Map as MapIcon,
  X
} from "lucide-react"
import type { Report } from "@/lib/types"

// Dynamic import for Leaflet map
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
}

export function MapContent({ reports: initialReports }: MapContentProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [showMobileList, setShowMobileList] = useState(false)
  
  const supabase = createClient()

  // --- 1. HANDLE VOTING ---
  const handleVote = async (reportId: string) => {
    const { data, error } = await supabase.rpc('toggle_vote', { report_id_input: reportId })

    if (error) {
      console.error("Vote failed:", error.message)
      alert("Please log in to vote on petitions.")
      return
    }

    if (data && typeof data.count === 'number') {
      const updateReport = (list: Report[]) => 
        list.map(r => r.id === reportId ? { ...r, upvotes: data.count } : r)

      setReports(prev => updateReport(prev))
      setVisibleReports(prev => updateReport(prev))
    }
  }

  // --- 2. AGGREGATE STATS ---
  const cityStats = useMemo(() => {
    const stats: Record<string, { count: number; highRisk: number; votes: number }> = {}

    visibleReports.forEach((r) => {
      const city = r.city || "Unknown Region"
      if (!stats[city]) {
        stats[city] = { count: 0, highRisk: 0, votes: 0 }
      }
      stats[city].count += 1
      stats[city].votes += (r.upvotes || 0)

      // Count High/Critical risks
      const risk = r.risk_level?.toLowerCase() || ""
      if (risk === "high" || risk === "critical") {
        stats[city].highRisk += 1
      }
    })

    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [visibleReports])

  // --- 3. STABLE HANDLER FOR MAP VIEW CHANGE (CRITICAL FIX) ---
  const handleViewChange = useCallback((visible: Report[], zoom: number) => {
    setVisibleReports(visible)
    setCurrentZoom(zoom)
  }, [])

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      
      {/* SIDEBAR */}
      <div className={`
          absolute inset-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-in-out
          md:static md:w-[400px] md:flex-shrink-0 md:translate-x-0 md:border-r md:shadow-xl md:z-auto
          ${showMobileList ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-card flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div>
                <h2 className="font-bold text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Community Voice
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {currentZoom < 8 
                    ? `${cityStats.length} regions affected` 
                    : `${visibleReports.length} petitions nearby`
                    }
                </p>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setShowMobileList(false)}
            >
                <X className="h-5 w-5" />
            </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-24 md:pb-4">
          {/* ... (Same list rendering logic as before) ... */}
          {currentZoom < 8 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Most Affected Regions</div>
              {cityStats.length === 0 ? <div className="text-center p-8 text-muted-foreground">No data available.</div> : (
                cityStats.map(([city, stat]) => (
                  <Card key={city} className="hover:border-blue-400 transition cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-blue-700 transition-colors">{city}</h3>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                             <Users className="h-3 w-3" />{stat.votes} people affected
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono">{stat.count} Reports</Badge>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <div className="flex justify-between text-xs">
                           <span>Critical Issues</span>
                           <span className={stat.highRisk > 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>{stat.highRisk}</span>
                        </div>
                        <Progress value={stat.count > 0 ? (stat.highRisk / stat.count) * 100 : 0} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Active Petitions</span>
                <Badge variant="outline" className="text-xs font-normal">Sorted by Severity</Badge>
              </div>
              {visibleReports.length === 0 ? <div className="flex flex-col items-center justify-center p-10 text-muted-foreground border-2 border-dashed rounded-lg"><MapPin className="h-8 w-8 mb-2 opacity-50" /><p>No reports in view.</p></div> : (
                visibleReports.map((report) => (
                  <Card key={report.id} className="overflow-hidden group hover:shadow-md transition-all duration-200 border-l-4"
                    style={{ 
                      borderLeftColor: 
                        report.risk_level === 'High' ? '#ef4444' : 
                        report.risk_level === 'Medium' ? '#eab308' : '#22c55e' 
                    }}
                  >
                    <div className="relative h-40 w-full bg-slate-100">
                      {report.image_url ? <img src={report.image_url} alt="Evidence" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-slate-400 text-sm">No Evidence</div>}
                      <div className="absolute top-2 right-2">
                        <Badge 
                          className={
                            report.risk_level === 'High' ? 'bg-red-500 hover:bg-red-600' :
                            report.risk_level === 'Medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                            'bg-green-500 hover:bg-green-600'
                          }
                        >
                          {report.risk_level || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h4 className="font-bold text-base leading-tight mb-1">{report.title}</h4>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{report.category || 'General'}</span>
                      </div>

                      <Separator className="my-3" />

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate" title={report.address || report.city}>
                            {report.address || report.city || "No Address"}
                          </span>
                        </div>
                        <p className="text-slate-500 leading-tight italic truncate">{report.audit_reasoning || "AI analysis in progress..."}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 text-slate-400" /><span className="truncate">{report.city || "Unknown"}</span></div>
                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /><span>{new Date(report.created_at).toLocaleDateString()}</span></div>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-muted-foreground font-medium uppercase">
                             Community Impact
                           </span>
                           <div className="flex items-center gap-1">
                             <Users className="h-3.5 w-3.5 text-blue-600" />
                             <span className="font-bold text-sm text-slate-700">
                               {report.upvotes || 0} Affected
                             </span>
                           </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="h-9 px-4 gap-2 bg-white text-slate-700 border hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm"
                          onClick={() => handleVote(report.id)}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Support Petition
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative h-full w-full z-0">
        <LeafletMap 
          reports={reports} 
          onViewChange={handleViewChange} // Pass the stable callback here
        />
        
        <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-medium text-slate-600 pointer-events-none items-center gap-2">
           {currentZoom < 8 ? "Zoom in to see details" : "Viewing street level data"}
        </div>
      </div>

      {/* MOBILE TOGGLE */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[50] md:hidden">
        <Button 
          onClick={() => setShowMobileList(!showMobileList)} 
          className="rounded-full shadow-xl px-6 h-12 bg-slate-900 text-white hover:bg-slate-800 transition-transform active:scale-95 border border-slate-700"
        >
          {showMobileList ? <><MapIcon className="mr-2 h-4 w-4" /> Show Map</> : <><List className="mr-2 h-4 w-4" /> Show List</>}
        </Button>
      </div>

    </div>
  )
}