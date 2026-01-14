"use client"

import { useState, useMemo } from "react"
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
  AlertTriangle, 
  Navigation, 
  Users,
  Loader2
} from "lucide-react"
import type { Report } from "@/lib/types"

// Dynamic import for Leaflet map to prevent SSR issues
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
  // State for reports (allows local updates when voting)
  const [reports, setReports] = useState<Report[]>(initialReports)
  // State for what is currently visible on the map
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  // State for zoom level to toggle sidebar views
  const [currentZoom, setCurrentZoom] = useState(5)
  
  const supabase = createClient()

  // --- 1. HANDLE VOTING (Petition Feature) ---
  const handleVote = async (reportId: string) => {
    // Call the smart toggle_vote RPC function we created
    const { data, error } = await supabase.rpc('toggle_vote', { report_id_input: reportId })

    if (error) {
      console.error("Vote failed:", error.message)
      // Optional: Add a toast notification here
      alert("Please log in to vote on petitions.")
      return
    }

    // Update the local state with the authoritative count from DB
    if (data && typeof data.count === 'number') {
      const updateReport = (list: Report[]) => 
        list.map(r => r.id === reportId ? { ...r, upvotes: data.count } : r)

      setReports(prev => updateReport(prev))
      setVisibleReports(prev => updateReport(prev))
    }
  }

  // --- 2. AGGREGATE STATS (For Zoomed Out View) ---
  const cityStats = useMemo(() => {
    // Group reports by City
    const stats: Record<string, { count: number; highRisk: number; votes: number }> = {}

    visibleReports.forEach((r) => {
      const city = r.city || "Unknown Region"
      if (!stats[city]) {
        stats[city] = { count: 0, highRisk: 0, votes: 0 }
      }

      stats[city].count += 1
      stats[city].votes += (r.upvotes || 0)

      // Count High/Critical risks
      const risk = r.severity?.toLowerCase() || ""
      if (risk === "high" || risk === "critical") {
        stats[city].highRisk += 1
      }
    })

    // Convert to array and sort by number of issues (descending)
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [visibleReports])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      
      {/* --- LEFT SIDEBAR (Explorer) --- */}
      <div className="w-[420px] flex-shrink-0 border-r bg-background flex flex-col shadow-xl z-10">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b bg-card">
          <h2 className="font-bold text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Community Voice
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentZoom < 8 
              ? `${cityStats.length} regions affected in this view` 
              : `${visibleReports.length} petitions active in this area`
            }
          </p>
        </div>

        {/* Sidebar Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          
          {/* VIEW A: REGIONAL SUMMARY (Zoomed Out) */}
          {currentZoom < 8 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Most Affected Regions
              </div>
              
              {cityStats.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                   No data available in this view.
                </div>
              ) : (
                cityStats.map(([city, stat]) => (
                  <Card key={city} className="hover:border-blue-400 transition cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-blue-700 transition-colors">{city}</h3>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                             <Users className="h-3 w-3" />
                             {stat.votes} people affected
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {stat.count} Reports
                        </Badge>
                      </div>

                      {/* Severity Progress Bar */}
                      <div className="space-y-1.5 mt-3">
                        <div className="flex justify-between text-xs">
                           <span>Critical Issues</span>
                           <span className={stat.highRisk > 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                             {stat.highRisk}
                           </span>
                        </div>
                        <Progress 
                          value={stat.count > 0 ? (stat.highRisk / stat.count) * 100 : 0} 
                          className="h-1.5"
                          // Color code the progress bar via tailwind classes in global css or custom logic
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            
            /* VIEW B: DETAILED PETITION LIST (Zoomed In) */
            <div className="space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Active Petitions</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Sorted by Severity
                </Badge>
              </div>

              {visibleReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MapPin className="h-8 w-8 mb-2 opacity-50" />
                  <p>No reports found in this specific area.</p>
                  <p className="text-xs">Try moving the map.</p>
                </div>
              ) : (
                visibleReports.map((report) => (
                  <Card key={report.id} className="overflow-hidden group hover:shadow-md transition-all duration-200 border-l-4"
                    style={{ 
                      borderLeftColor: 
                        report.severity === 'high' ? '#ef4444' : 
                        report.severity === 'medium' ? '#eab308' : '#22c55e' 
                    }}
                  >
                    {/* Image Section */}
                    <div className="relative h-40 w-full bg-slate-100">
                      {report.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={report.image_url} 
                          alt="Evidence" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                          No Evidence Photo
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge 
                          className={
                            report.severity === 'high' ? 'bg-red-500 hover:bg-red-600' :
                            report.severity === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                            'bg-green-500 hover:bg-green-600'
                          }
                        >
                          {report.severity || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Title & Category */}
                      <div className="mb-3">
                        <h4 className="font-bold text-base leading-tight mb-1">{report.title}</h4>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          {report.category || 'General'}
                        </span>
                      </div>

                      <Separator className="my-3" />

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate" title={(report.address || report.city) || ""}>
                            {report.address || report.city || "No Address"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2 font-mono text-[10px] opacity-70">
                          <Navigation className="h-3 w-3" />
                          {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                        </div>
                      </div>

                      {/* Action Bar */}
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
                          Confirm Issue
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

      {/* --- RIGHT SIDE (Map) --- */}
      <div className="flex-1 relative h-full w-full">
        <LeafletMap 
          reports={reports} 
          onViewChange={(visible, zoom) => {
            // Update state based on map movement
            setVisibleReports(visible)
            setCurrentZoom(zoom)
          }} 
        />

        {/* Floating Zoom Indicator Helper */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 text-xs font-medium text-slate-600 pointer-events-none flex items-center gap-2">
           {currentZoom < 8 ? (
             <>
               <Users className="h-3.5 w-3.5 text-blue-500" />
               <span>Zoom in to view individual petitions</span>
             </>
           ) : (
             <>
               <MapPin className="h-3.5 w-3.5 text-green-500" />
               <span>Viewing street-level reports</span>
             </>
           )}
        </div>
      </div>
    </div>
  )
}