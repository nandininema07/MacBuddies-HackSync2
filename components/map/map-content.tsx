"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { 
  MapPin, 
  ThumbsUp, 
  ThumbsDown,
  CheckCircle,
  Calendar, 
  Users,
  Loader2,
  BrainCircuit,
  X,
  List,
  Filter,
  Droplets,
  Zap,
  Car,
  Building,
  Wrench,
  AlertTriangle,
  Gavel,
  Info,// Added Info Icon
  Map as MapIcon
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
  predictions?: any[] 
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Filter },
  { id: 'road', label: 'Roads', icon: Car },
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'electrical', label: 'Electric', icon: Zap },
  { id: 'building', label: 'Infra', icon: Building },
  { id: 'drainage', label: 'Drainage', icon: Wrench },
]

export default function MapContent({ reports: initialReports, predictions = [] }: MapContentProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  const [currentZoom, setCurrentZoom] = useState(12)
  const [showMobileList, setShowMobileList] = useState(false)
  const [showForecast, setShowForecast] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // NEW: Legend State
  const [showLegend, setShowLegend] = useState(false)
  
  const [userInteractions, setUserInteractions] = useState<Map<string, string>>(new Map())
  
  const searchParams = useSearchParams()
  const focusedReportId = searchParams.get('focus')
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const supabase = createClient()

  useEffect(() => {
    const fetchInteractions = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('report_interactions').select('report_id, interaction_type').eq('user_id', user.id)
      
      if (data) {
        const interactionMap = new Map()
        data.forEach(item => interactionMap.set(item.report_id, item.interaction_type))
        setUserInteractions(interactionMap)
      }
    }
    fetchInteractions()
  }, [])

  useEffect(() => {
    if (focusedReportId && itemRefs.current[focusedReportId]) {
      setShowMobileList(true)
      itemRefs.current[focusedReportId]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, [focusedReportId, visibleReports])

  const handleInteraction = async (reportId: string, actionType: 'up' | 'down' | 'resolved') => {
    const previousType = userInteractions.get(reportId);
    
    setUserInteractions(prev => {
        const next = new Map(prev);
        if (previousType === actionType) next.delete(reportId); 
        else next.set(reportId, actionType); 
        return next;
    });

    const updateCounters = (list: Report[]) => list.map(r => {
        if (r.id !== reportId) return r;
        let newUp = r.upvotes || 0;
        let newDown = r.downvotes || 0;
        let newResolved = r.resolved_votes || 0;

        if (previousType === 'up') newUp--;
        if (previousType === 'down') newDown--;
        if (previousType === 'resolved') newResolved--;

        if (previousType !== actionType) {
            if (actionType === 'up') newUp++;
            if (actionType === 'down') newDown++;
            if (actionType === 'resolved') newResolved++;
        }
        return { ...r, upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown), resolved_votes: Math.max(0, newResolved) };
    });

    setReports(prev => updateCounters(prev));
    setVisibleReports(prev => updateCounters(prev));

    await supabase.rpc('toggle_interaction', { report_id_input: reportId, action_type: actionType });
  }

  const displayData = useMemo(() => {
    let data = showForecast ? predictions : visibleReports;
    
    if (selectedCategory !== 'all') {
      data = data.filter(r => (r.category || 'other').toLowerCase() === selectedCategory);
    }
    
    if (focusedReportId) {
        const focused = data.find(r => r.id === focusedReportId)
        const others = data.filter(r => r.id !== focusedReportId)
        if (focused) return [focused, ...others]
    }

    return data.filter(r => r.status !== 'resolved');
  }, [showForecast, predictions, visibleReports, selectedCategory, focusedReportId]);

  const cityStats = useMemo(() => {
    const stats: Record<string, { count: number; highRisk: number; votes: number }> = {}
    displayData.forEach((r) => {
      const city = r.city || "Unknown Region"
      if (!stats[city]) stats[city] = { count: 0, highRisk: 0, votes: 0 }
      stats[city].count += 1
      stats[city].votes += (r.upvotes || 0)
      if (r.risk_level === 'High') stats[city].highRisk += 1
    })
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [displayData])

  const handleViewChange = useCallback((visible: Report[], zoom: number) => {
    setVisibleReports(visible)
    setCurrentZoom(zoom)
  }, [])

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      
      {/* SIDEBAR */}
      <div className={`
          absolute inset-0 z-40 flex flex-col bg-background transition-transform duration-300 ease-in-out
          md:static md:w-[420px] md:flex-shrink-0 md:translate-x-0 md:border-r md:shadow-xl md:z-auto
          ${showMobileList ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Header */}
        <div className="p-4 border-b bg-card flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div>
                <h2 className="font-bold text-xl flex items-center gap-2">
                    {showForecast ? <BrainCircuit className="h-5 w-5 text-purple-600" /> : <Users className="h-5 w-5 text-blue-600" />}
                    {showForecast ? "AI Forecast" : "Community Voice"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {currentZoom < 8 ? `${cityStats.length} regions` : `${displayData.length} issues in view`}
                </p>
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMobileList(false)}>
                <X className="h-5 w-5" />
            </Button>
        </div>

        {/* Controls */}
        <div className="bg-slate-50 border-b flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {showForecast ? "Predictive Mode" : "Real-time Mode"}
                </span>
                <Button 
                    size="sm" 
                    variant={showForecast ? "secondary" : "default"}
                    className={`h-6 text-[10px] px-2 ${showForecast ? 'bg-purple-100 text-purple-700' : ''}`}
                    onClick={() => setShowForecast(!showForecast)}
                >
                    {showForecast ? "Exit AI" : "AI Forecast"}
                </Button>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isActive = selectedCategory === cat.id
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
                        >
                            <Icon className="h-3 w-3" /> {cat.label}
                        </button>
                    )
                })}
            </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-24 md:pb-4">
          
          {currentZoom < 8 && !focusedReportId ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Most Affected Regions</div>
              {cityStats.length === 0 ? <div className="text-center p-8 text-muted-foreground">No reports found in this area.</div> : (
                cityStats.map(([city, stat]) => (
                  <Card key={city} className="hover:border-blue-400 transition cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-blue-700">{city}</h3>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                             <Users className="h-3 w-3" /> {stat.votes} votes
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono">{stat.count} Issues</Badge>
                      </div>
                      <Progress value={stat.count > 0 ? (stat.highRisk / stat.count) * 100 : 0} className="h-1.5 mt-3" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>{showForecast ? "Predictions" : "Active Issues"}</span>
                {focusedReportId && <Badge className="bg-blue-600 hover:bg-blue-700">New Report Highlighted</Badge>}
              </div>

              {displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-muted-foreground border-2 border-dashed rounded-lg">
                  <MapPin className="h-8 w-8 mb-2 opacity-50" />
                  <p>No reports match your filters in this view.</p>
                </div>
              ) : (
                displayData.map((item) => {
                    const isPrediction = showForecast;
                    const isFocused = item.id === focusedReportId;
                    const isLowPriority = !isPrediction && !isFocused && (item.downvotes || 0) > (item.upvotes || 0);
                    
                    const title = item.title || "Infrastructure Issue";
                    const category = item.category || "General";
                    const imageUrl = item.image_url;
                    const severity = isPrediction ? item.prediction?.label : (item.risk_level || 'Pending');
                    const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
                    
                    const auditReason = isPrediction ? `AI Confidence: ${item.prediction?.score}%` : item.audit_reasoning || "AI analysis in progress...";
                    const isMatched = isPrediction ? true : !!item.matched_project_id;
                    const myInteraction = userInteractions.get(item.id);

                    return (
                        <div key={item.id} ref={(el) => (itemRefs.current[item.id] = el)}>
                        <Card className={`overflow-hidden group hover:shadow-md transition-all duration-200 border-l-4 
                            ${isFocused ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]' : ''} 
                            ${isLowPriority ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}`}
                            style={{ borderLeftColor: severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#eab308' : '#22c55e' }}
                        >
                            {/* --- IMAGE SECTION --- */}
                            <div className="relative h-40 w-full bg-slate-100">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="Evidence" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">No Evidence Photo</div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className={severity === 'High' || severity === 'Critical' ? 'bg-red-50 hover:bg-red-600' : severity === 'Medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-50 hover:bg-green-600'}>
                                        {severity} Risk
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-4">
                                <div className="mb-3">
                                    <h4 className="font-bold text-base leading-tight mb-1">
                                        {isPrediction ? <span className="text-purple-600">[AI] </span> : ""}
                                        {title}
                                    </h4>
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                        {category}
                                    </span>
                                </div>

                                {/* --- VERDICT SECTION --- */}
                                <div className={`mb-3 p-3 rounded border ${isPrediction ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isPrediction ? <BrainCircuit className="h-4 w-4 text-purple-600" /> : <Gavel className="h-4 w-4 text-blue-600" />}
                                            <span className="text-sm">{isPrediction ? "AI Prediction" : "Official Verdict"}</span>
                                        </div>
                                        {!isPrediction && (
                                            isMatched ? (
                                                severity === 'High' ? 
                                                <span className="text-[10px] text-red-600 font-bold border border-red-200 bg-white px-2 py-0.5 rounded-full uppercase">Mismatch</span> : 
                                                <span className="text-[10px] text-green-600 font-bold border border-green-200 bg-white px-2 py-0.5 rounded-full uppercase">Verified</span>
                                            ) : <span className="text-[10px] text-orange-600 font-bold border border-orange-200 bg-white px-2 py-0.5 rounded-full uppercase">No Record</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                        {auditReason}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="truncate">{item.city || "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{date}</span>
                                    </div>
                                </div>

                                {!isPrediction && (
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`h-8 text-xs gap-1 border ${myInteraction === 'up' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 border-slate-100 hover:bg-green-50'}`}
                                            onClick={() => handleInteraction(item.id, 'up')}
                                        >
                                            <ThumbsUp className={`h-3.5 w-3.5 ${myInteraction === 'up' ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{item.upvotes || 0}</span>
                                        </Button>
                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`h-8 text-xs gap-1 border ${myInteraction === 'down' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-50 border-slate-100 hover:bg-red-50'}`}
                                            onClick={() => handleInteraction(item.id, 'down')}
                                        >
                                            <ThumbsDown className={`h-3.5 w-3.5 ${myInteraction === 'down' ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{item.downvotes || 0}</span>
                                        </Button>
                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`h-8 text-xs gap-1 border ${myInteraction === 'resolved' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-blue-50'}`}
                                            onClick={() => handleInteraction(item.id, 'resolved')}
                                        >
                                            <CheckCircle className={`h-3.5 w-3.5 ${myInteraction === 'resolved' ? 'fill-current' : ''}`} />
                                            <span>Fixed</span>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        </div>
                    )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative h-full w-full z-0">
        <LeafletMap 
          reports={reports}
          onViewChange={handleViewChange} 
        />
        
        {/* Mobile List Toggle */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[50] md:hidden">
            <Button onClick={() => setShowMobileList(!showMobileList)} className="rounded-full shadow-xl px-6 h-12 bg-slate-900 text-white border border-slate-700">
            {showMobileList ? <><MapIcon className="mr-2 h-4 w-4" /> Show Map</> : <><List className="mr-2 h-4 w-4" /> Show List</>}
            </Button>
        </div>

        {/* --- NEW: FLOATING VERDICT LEGEND --- */}
        <div className="absolute bottom-6 right-4 z-[50] flex flex-col items-end gap-2">
            {showLegend && (
                <Card className="w-72 shadow-2xl border-slate-200 animate-in slide-in-from-bottom-2 fade-in duration-200 mb-2">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Gavel className="h-4 w-4 text-blue-600"/> Verdict Legend
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLegend(false)}>
                            <X className="h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                        <div className="flex gap-3 items-start">
                            <div className="h-2.5 w-2.5 mt-1.5 rounded-full bg-red-500 shadow-sm flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-900">High Risk / Negligence</p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                    Official records say "Completed" but damage exists, OR no record exists for a damaged road.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-2.5 w-2.5 mt-1.5 rounded-full bg-yellow-500 shadow-sm flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-900">Suspicious Activity</p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                     Work detected (digging/debris) but official status is "Not Started".
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-2.5 w-2.5 mt-1.5 rounded-full bg-green-500 shadow-sm flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-900">Compliant</p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                     Physical evidence matches the official "In Progress" government record.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <Button 
                size="icon" 
                className="h-12 w-12 rounded-full shadow-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                onClick={() => setShowLegend(!showLegend)}
                title="Verdict Legend"
            >
                <Info className="h-6 w-6" />
            </Button>
        </div>
      </div>

    </div>
  )
}