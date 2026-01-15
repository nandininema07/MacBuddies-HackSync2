"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
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
  ShieldCheck,
  X,
  BrainCircuit,
  TrendingUp,
  Map as MapIcon,
  List,
  Filter,
  Droplets,
  Zap,
  Car,
  Building,
  Wrench,
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

export function MapContent({ reports: initialReports, predictions = [] }: MapContentProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [visibleReports, setVisibleReports] = useState<Report[]>(initialReports)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [showMobileList, setShowMobileList] = useState(false)
  const [showForecast, setShowForecast] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  const [userInteractions, setUserInteractions] = useState<Map<string, string>>(new Map())
  
  const supabase = createClient()

  // --- 1. FETCH USER INTERACTIONS ---
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

  // --- 2. HANDLE COMMUNITY ACTIONS ---
  const handleInteraction = async (reportId: string, actionType: 'up' | 'down' | 'resolved') => {
    const previousType = userInteractions.get(reportId);
    
    // Update local user interaction map
    setUserInteractions(prev => {
        const next = new Map(prev);
        if (previousType === actionType) next.delete(reportId); 
        else next.set(reportId, actionType); 
        return next;
    });

    // Helper to calculate new counts
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

    // Update BOTH Main List and Visible List so UI reflects changes instantly
    setReports(prev => updateCounters(prev));
    setVisibleReports(prev => updateCounters(prev));

    // DB Call
    const { data, error } = await supabase.rpc('toggle_interaction', { 
        report_id_input: reportId, 
        action_type: actionType 
    });

    if (error) {
      console.error("Action failed:", error.message);
      alert("Please log in to participate.");
    } else if (data) {
       // Sync authoritative data
       const syncData = (list: Report[]) => list.map(r => {
           if (r.id === reportId) {
               return { 
                   ...r, 
                   upvotes: data.upvotes, 
                   downvotes: data.downvotes, 
                   resolved_votes: data.resolved_votes,
                   status: data.status 
               };
           }
           return r;
       });
       setReports(prev => syncData(prev));
       setVisibleReports(prev => syncData(prev));
    }
  }

  // --- 3. DISPLAY LOGIC (FIXED) ---
  const displayData = useMemo(() => {
    // FIX: Use 'visibleReports' (Filtered by Map) instead of 'reports' (All)
    // This ensures only the items currently in the viewport are shown in the sidebar
    let data = showForecast ? predictions : visibleReports;
    
    if (selectedCategory !== 'all') {
      data = data.filter(r => (r.category || 'other').toLowerCase() === selectedCategory);
    }
    
    data = data.filter(r => r.status !== 'resolved');

    return data;
  }, [showForecast, predictions, visibleReports, selectedCategory]); // Dependencies updated

  const cityStats = useMemo(() => {
    const stats: Record<string, { count: number; highRisk: number; votes: number }> = {}

    displayData.forEach((r) => {
      const city = r.city || "Unknown Region"
      if (!stats[city]) stats[city] = { count: 0, highRisk: 0, votes: 0 }
      
      stats[city].count += 1
      if (showForecast) {
         stats[city].votes += (r.prediction?.score || 0)
         if (r.prediction?.label === 'High') stats[city].highRisk += 1
      } else {
         stats[city].votes += (r.upvotes || 0)
         if (r.risk_level === 'High') stats[city].highRisk += 1
      }
    })

    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count)
  }, [displayData, showForecast])

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
          dark:border-slate-800
          ${showMobileList ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Header */}
        <div className="p-4 border-b bg-card flex justify-between items-center sticky top-0 z-10 shadow-sm dark:border-slate-800">
            <div>
                <h2 className="font-bold text-xl flex items-center gap-2 text-foreground">
                    {showForecast ? <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" /> : <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
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
        <div className="bg-slate-50 border-b flex flex-col dark:bg-slate-900/50 dark:border-slate-800">
            <div className="px-4 py-2 border-b flex items-center justify-between dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    {showForecast ? "Predictive Mode" : "Real-time Mode"}
                </span>
                <Button 
                    size="sm" 
                    variant={showForecast ? "secondary" : "default"}
                    className={`h-6 text-[10px] px-2 ${showForecast ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}`}
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
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors
                                ${isActive 
                                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100' 
                                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }
                            `}
                        >
                            <Icon className="h-3 w-3" /> {cat.label}
                        </button>
                    )
                })}
            </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 pb-24 md:pb-4 dark:bg-slate-950/50">
          
          {/* VIEW A: AGGREGATE */}
          {currentZoom < 8 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Most Affected Regions</div>
              {cityStats.length === 0 ? <div className="text-center p-8 text-muted-foreground">No reports found in this area.</div> : (
                cityStats.map(([city, stat]) => (
                  <Card key={city} className="hover:border-blue-400 transition cursor-pointer group dark:bg-card dark:border-slate-800">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-blue-700 dark:group-hover:text-blue-400 dark:text-slate-200">{city}</h3>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                             <Users className="h-3 w-3" /> {stat.votes} votes
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono dark:bg-slate-800 dark:text-slate-300">{stat.count} Issues</Badge>
                      </div>
                      <Progress value={stat.count > 0 ? (stat.highRisk / stat.count) * 100 : 0} className="h-1.5 mt-3" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            
            /* VIEW B: DETAILED LIST */
            <div className="space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>{showForecast ? "Predictions" : "Active Issues"}</span>
                <Badge variant="outline" className="text-xs font-normal dark:border-slate-700 dark:text-slate-400">Sorted by Severity</Badge>
              </div>

              {displayData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-muted-foreground border-2 border-dashed rounded-lg dark:border-slate-800">
                  <MapPin className="h-8 w-8 mb-2 opacity-50" />
                  <p>No reports match your filters in this view.</p>
                </div>
              ) : (
                displayData.map((item) => {
                    const isPrediction = showForecast;
                    const isLowPriority = !isPrediction && (item.downvotes || 0) > (item.upvotes || 0);
                    
                    const title = item.title || "Infrastructure Issue";
                    const category = item.category || "General";
                    const imageUrl = item.image_url;
                    const severity = isPrediction ? item.prediction?.label : (item.risk_level || 'Pending');
                    const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
                    
                    const auditReason = isPrediction ? `AI Confidence: ${item.prediction?.score}%` : item.audit_reasoning || "AI analysis in progress...";
                    const isMatched = isPrediction ? true : !!item.matched_project_id;
                    const myInteraction = userInteractions.get(item.id);

                    return (
                        <Card key={item.id} className={`overflow-hidden group hover:shadow-md transition-all duration-200 border-l-4 dark:bg-card dark:border-y-slate-800 dark:border-r-slate-800 ${isLowPriority ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}`}
                            style={{ borderLeftColor: severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#eab308' : '#22c55e' }}
                        >
                            {/* --- IMAGE SECTION --- */}
                            <div className="relative h-40 w-full bg-slate-100 dark:bg-slate-900">
                                {imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imageUrl} alt="Evidence" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm dark:text-slate-600">No Evidence Photo</div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className={severity === 'High' || severity === 'Critical' ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600' : severity === 'Medium' ? 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600' : 'bg-green-500 hover:bg-green-600 dark:bg-green-600'}>
                                        {severity} Risk
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-4">
                                {/* --- TITLE & CATEGORY --- */}
                                <div className="mb-3">
                                    <h4 className="font-bold text-base leading-tight mb-1 text-foreground">
                                        {isPrediction ? <span className="text-purple-600 dark:text-purple-400">[AI] </span> : ""}
                                        {title}
                                    </h4>
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                        {category}
                                    </span>
                                </div>

                                {/* --- AUDIT VERDICT --- */}
                                <div className={`
                                    mb-3 p-2.5 rounded border text-xs 
                                    ${isPrediction 
                                        ? 'bg-purple-50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900' 
                                        : 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800'
                                    }
                                `}>
                                    <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                        {isPrediction ? <BrainCircuit className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                        <span>{isPrediction ? "AI Prediction:" : "Integrity Audit:"}</span>
                                        {!isPrediction && (
                                            isMatched ? (
                                                severity === 'High' ? <span className="text-red-600 dark:text-red-400 font-bold">⚠️ Mismatch</span> : <span className="text-green-600 dark:text-green-400 font-bold">✅ Verified</span>
                                            ) : <span className="text-orange-600 dark:text-orange-400 font-medium">No Record</span>
                                        )}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 leading-tight italic truncate">
                                        {auditReason}
                                    </p>
                                </div>

                                {/* --- DETAILS GRID --- */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                        <span className="truncate">{item.city || "Unknown"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                        <span>{date}</span>
                                    </div>
                                </div>

                                {/* --- ACTION BAR --- */}
                                {isLowPriority && (
                                    <div className="mb-3 text-[10px] text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 px-2 py-1 rounded flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Disputed by Community
                                    </div>
                                )}

                                {!isPrediction && (
                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t dark:border-slate-800">
                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`
                                                h-8 text-xs gap-1 border 
                                                ${myInteraction === 'up' 
                                                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-green-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-green-950/30'
                                                }
                                            `}
                                            onClick={() => handleInteraction(item.id, 'up')}
                                        >
                                            <ThumbsUp className={`h-3.5 w-3.5 ${myInteraction === 'up' ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{item.upvotes || 0}</span>
                                        </Button>

                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`
                                                h-8 text-xs gap-1 border 
                                                ${myInteraction === 'down' 
                                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-red-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-red-950/30'
                                                }
                                            `}
                                            onClick={() => handleInteraction(item.id, 'down')}
                                        >
                                            <ThumbsDown className={`h-3.5 w-3.5 ${myInteraction === 'down' ? 'fill-current' : ''}`} />
                                            <span className="font-bold">{item.downvotes || 0}</span>
                                        </Button>

                                        <Button 
                                            variant="ghost" size="sm" 
                                            className={`
                                                h-8 text-xs gap-1 border 
                                                ${myInteraction === 'resolved' 
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-blue-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-blue-950/30'
                                                }
                                            `}
                                            onClick={() => handleInteraction(item.id, 'resolved')}
                                        >
                                            <CheckCircle className={`h-3.5 w-3.5 ${myInteraction === 'resolved' ? 'fill-current' : ''}`} />
                                            <span>Fixed</span>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[50] md:hidden">
            <Button onClick={() => setShowMobileList(!showMobileList)} className="rounded-full shadow-xl px-6 h-12 bg-slate-900 text-white border border-slate-700 dark:bg-slate-100 dark:text-slate-900">
            {showMobileList ? <><MapIcon className="mr-2 h-4 w-4" /> Show Map</> : <><List className="mr-2 h-4 w-4" /> Show List</>}
            </Button>
        </div>
      </div>

    </div>
)
}