"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { MapPin, ThumbsUp, Calendar } from "lucide-react"
import type { Report } from "@/lib/types"

// Load Map Dynamically to avoid window is not defined error
const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

export function MapContent({ reports: initialReports }: { reports: Report[] }) {
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [reports, setReports] = useState(initialReports) // Local state for optimistic updates
  const supabase = createClient()

  // 1. Voting Logic
  const handleVote = async (reportId: string) => {
    // Optimistic Update
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r
    ))

    // DB Update
    const { error } = await supabase.rpc('increment_vote', { report_id: reportId })
    if (error) console.error("Vote failed:", error)
  }

  // 2. Aggregation Logic (Group by City)
  const cityStats = useMemo(() => {
    const stats: Record<string, { count: number, highRisk: number, votes: number }> = {}
    
    visibleReports.forEach(r => {
      const city = r.city || "Unknown Area"
      if (!stats[city]) stats[city] = { count: 0, highRisk: 0, votes: 0 }
      
      stats[city].count++
      stats[city].votes += (r.upvotes || 0)
      
      // Ensure risk_level check is case-insensitive if needed, or matches your DB exactly
      if (r.risk_level === 'High' || r.risk_level === 'high') stats[city].highRisk++
    })

    // FIX: Use array indexing [1] instead of .1
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [visibleReports])

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div className="w-[400px] flex-shrink-0 border-r bg-background flex flex-col shadow-xl z-10">
        <div className="p-4 border-b">
          <h2 className="font-bold text-xl">Infrastructure Issues</h2>
          <p className="text-sm text-muted-foreground">
            {visibleReports.length} reports in view
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* A. AGGREGATE VIEW (When Zoomed Out) */}
          {currentZoom < 8 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Affected Cities ({cityStats.length})
              </div>
              {cityStats.map(([city, stat]) => (
                <Card key={city} className="hover:bg-accent/50 transition cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold">{city}</h3>
                      <Badge variant="outline">{stat.count} Issues</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                       <div className="flex justify-between">
                         <span>High Risk Cases:</span>
                         <span className="text-red-500 font-medium">{stat.highRisk}</span>
                       </div>
                       <div className="flex justify-between">
                         <span>People Affected:</span>
                         <span className="font-medium">{stat.votes}</span>
                       </div>
                       {/* Avoid division by zero */}
                       <Progress value={stat.count > 0 ? (stat.highRisk / stat.count) * 100 : 0} className="h-1 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            
            /* B. DETAILED LIST VIEW (When Zoomed In) */
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Active Petitions in View
              </div>
              {visibleReports.map(report => (
                <Card key={report.id} className="overflow-hidden group hover:border-blue-400 transition-all">
                  <div className="relative h-32 w-full bg-muted">
                    {report.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={report.image_url} className="w-full h-full object-cover" alt="evidence" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                    )}
                    <Badge 
                      className="absolute top-2 right-2 shadow-sm"
                      variant={report.risk_level === 'High' ? 'destructive' : 'default'}
                    >
                      {report.risk_level || 'Pending'} Risk
                    </Badge>
                  </div>
                  
                  <CardContent className="p-3">
                    <h4 className="font-bold text-sm line-clamp-1">{report.title}</h4>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{report.address || report.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                       <div className="text-xs font-medium">
                          <span className="text-primary">{report.upvotes || 0}</span> people affected
                       </div>
                       <Button 
                         size="sm" 
                         variant="secondary" 
                         className="h-8 gap-2 hover:bg-blue-100 hover:text-blue-700"
                         onClick={() => handleVote(report.id)}
                       >
                         <ThumbsUp className="h-3 w-3" />
                         Vote
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {visibleReports.length === 0 && (
                <div className="text-center p-8 text-gray-400">
                  <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>No reports in this area.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- MAP CONTAINER --- */}
      <div className="flex-1 h-full relative">
        <LeafletMap 
          reports={reports} 
          onViewChange={(visible, zoom) => {
            setVisibleReports(visible)
            setCurrentZoom(zoom)
          }} 
        />
        
        {/* Helper Overlay */}
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur p-2 rounded-md shadow-sm border text-xs pointer-events-none">
           {currentZoom < 8 ? "Zoom in to see details & vote" : "Browsing street level data"}
        </div>
      </div>
    </div>
  )
}