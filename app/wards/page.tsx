"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  Building2, 
  User, 
  History, 
  CheckCircle,
  Vote,
  ArrowLeft,
  MapPin,
  Landmark,
  X,
  TrendingUp,
  Clock,
  Star,
  FileText
} from "lucide-react"

// Types
interface WardHistory {
    year: string
    officer: string
    party: string
    stats?: {
        total: number
        resolved: number
        avg_days: number
        satisfaction: string
    }
}

interface Ward {
  id: string
  name: string
  city: string
  state: string
  current_officer: string
  current_party: string
  history: WardHistory[]
  contact_info: string
}

export default function WardPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("search") || ""
  
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(true)
  
  const [allWards, setAllWards] = useState<Ward[]>([])
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null) 
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, highRisk: 0 })

  const [selectedCity, setSelectedCity] = useState("All")
  const [selectedParty, setSelectedParty] = useState("All")

  const supabase = createClient()

  useEffect(() => {
    const fetchWards = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('wards').select('*').order('city')
      if (data) setAllWards(data)
      setLoading(false)
    }
    fetchWards()
  }, [])

  useEffect(() => {
    if (initialQuery && allWards.length > 0) {
      setQuery(initialQuery)
    }
  }, [initialQuery, allWards])

  // --- FILTERS & GROUPING ---
  const filteredWards = useMemo(() => {
    return allWards.filter(ward => {
      const matchSearch = 
        ward.name.toLowerCase().includes(query.toLowerCase()) || 
        ward.city.toLowerCase().includes(query.toLowerCase()) ||
        ward.current_party.toLowerCase().includes(query.toLowerCase())
      
      const matchCity = selectedCity === "All" || ward.city === selectedCity
      const matchParty = selectedParty === "All" || ward.current_party === selectedParty

      return matchSearch && matchCity && matchParty
    })
  }, [allWards, query, selectedCity, selectedParty])

  const groupedWards = useMemo(() => {
    const groups: Record<string, Ward[]> = {}
    filteredWards.forEach(ward => {
      if (!groups[ward.city]) groups[ward.city] = []
      groups[ward.city].push(ward)
    })
    return groups
  }, [filteredWards])

  const cities = Array.from(new Set(allWards.map(w => w.city))).sort()
  const parties = Array.from(new Set(allWards.map(w => w.current_party))).sort()

  // --- VIEW DETAILS ---
  const selectWard = async (wardData: Ward) => {
    setLoading(true)
    setSelectedWard(wardData)
    
    // Fetch Current Totals from Live Reports
    const { data: reports } = await supabase
        .from('reports')
        .select('status, risk_level')
        .ilike('city', wardData.city)

    if (reports) {
        const total = reports.length
        const resolved = reports.filter(r => r.status === 'resolved' || r.status === 'verified').length
        setStats({ 
            total, 
            resolved, 
            pending: reports.filter(r => r.status === 'pending').length, 
            highRisk: reports.filter(r => r.risk_level === 'High').length 
        })
    }
    setLoading(false)
  }

  const clearFilters = () => {
    setQuery("")
    setSelectedCity("All")
    setSelectedParty("All")
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background transition-colors duration-300">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* --- VIEW 1: DETAILS (Comparison Mode) --- */}
        {selectedWard ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button 
                variant="ghost" 
                className="mb-4 gap-2 text-slate-600 pl-0 hover:pl-2 transition-all dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => setSelectedWard(null)}
            >
                <ArrowLeft className="h-4 w-4" /> Back to Directory
            </Button>

            <div className="grid gap-6 md:grid-cols-3">
              
              {/* LEFT COLUMN: Ward Info & Overall Totals */}
              <div className="md:col-span-1 space-y-6">
                
                {/* 1. Profile Card */}
                <Card className="border-t-4 border-t-blue-600 shadow-md dark:bg-card dark:border-slate-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl dark:text-foreground">{selectedWard.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1 dark:text-slate-400">
                                <MapPin className="h-3 w-3" /> {selectedWard.city}, {selectedWard.state}
                            </CardDescription>
                        </div>
                        <Building2 className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Current Officer</span>
                            <span className="font-medium dark:text-slate-200">{selectedWard.current_officer}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Ruling Party</span>
                            <Badge variant="outline" className="font-normal dark:border-slate-700 dark:text-slate-300">{selectedWard.current_party}</Badge>
                        </div>
                     </div>
                     <Separator className="dark:bg-slate-800" />
                     <div className="text-xs text-slate-400 dark:text-slate-500">
                        <p className="font-semibold mb-1">Contact:</p>
                        <pre className="font-sans whitespace-pre-wrap dark:text-slate-400">{selectedWard.contact_info}</pre>
                     </div>
                  </CardContent>
                </Card>

                {/* 2. Simplified Status Card */}
                <Card className="shadow-sm dark:bg-card dark:border-slate-800">
                   <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-slate-600 dark:text-slate-300">Overall Ward Status</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="flex items-center justify-between mb-4">
                          <div>
                              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide dark:text-slate-500">Active Cases</div>
                          </div>
                          <div className="text-right">
                              <div className="text-3xl font-bold text-green-600 dark:text-green-500">{stats.resolved}</div>
                              <div className="text-xs text-slate-500 uppercase tracking-wide dark:text-slate-500">Resolved</div>
                          </div>
                      </div>
                      <Progress value={stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0} className="h-2 dark:bg-slate-800" />
                      <div className="flex justify-between mt-2 text-xs text-slate-400 dark:text-slate-500">
                          <span>0%</span>
                          <span>Resolution Rate</span>
                          <span>100%</span>
                      </div>
                   </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: Performance Comparison */}
              <div className="md:col-span-2">
                <Card className="h-full shadow-md border-0 bg-white dark:bg-card dark:border dark:border-slate-800">
                  <CardHeader className="bg-slate-50/50 border-b dark:bg-slate-900/50 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-2 dark:text-slate-100">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Administrator Performance Comparison
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      Compare how different parties and officers managed this ward during their tenure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                      <div className="space-y-8">
                          {selectedWard.history?.map((record, index) => {
                              // Calculate Percentage
                              const total = record.stats?.total || 1;
                              const resolved = record.stats?.resolved || 0;
                              const percentage = Math.round((resolved / total) * 100);
                              
                              return (
                                  <div key={index} className="relative pl-8 border-l-2 border-slate-200 last:border-0 pb-8 last:pb-0 dark:border-slate-800">
                                      {/* Timeline Node */}
                                      <div className={`
                                          absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-950
                                          ${index === 0 ? 'bg-green-500 ring-4 ring-green-100 dark:ring-green-900/30' : 'bg-slate-300 dark:bg-slate-600'}
                                      `} />

                                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{record.officer}</h3>
                                                  {index === 0 && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Current</Badge>}
                                              </div>
                                              <div className="text-sm text-slate-500 flex items-center gap-2 mt-1 dark:text-slate-400">
                                                  <Vote className="h-3 w-3" /> {record.party} 
                                                  <span>•</span> 
                                                  <Clock className="h-3 w-3" /> {record.year}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Performance Metrics Grid */}
                                      {record.stats ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 dark:bg-slate-950/50 dark:border-slate-800">
                                            
                                            {/* Metric 1: Efficiency */}
                                            <div className="col-span-2 md:col-span-1">
                                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1 dark:text-slate-400">
                                                    <CheckCircle className="h-3 w-3" /> Resolution Rate
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <span className={`text-xl font-bold ${percentage > 75 ? 'text-green-600 dark:text-green-500' : percentage > 50 ? 'text-yellow-600 dark:text-yellow-500' : 'text-red-600 dark:text-red-500'}`}>
                                                        {percentage}%
                                                    </span>
                                                    <span className="text-xs text-slate-400 mb-1 dark:text-slate-500">({resolved}/{total})</span>
                                                </div>
                                                <Progress value={percentage} className="h-1.5 mt-2 dark:bg-slate-800" />
                                            </div>

                                            {/* Metric 2: Speed */}
                                            <div className="col-span-1">
                                                <div className="text-xs text-slate-500 mb-1 dark:text-slate-400">Avg. Speed</div>
                                                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                                    {record.stats.avg_days} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">days</span>
                                                </div>
                                            </div>

                                            {/* Metric 3: Volume */}
                                            <div className="col-span-1">
                                                <div className="text-xs text-slate-500 mb-1 dark:text-slate-400">Total Cases</div>
                                                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                                    {record.stats.total.toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Metric 4: Satisfaction */}
                                            <div className="col-span-2 md:col-span-1 border-l pl-4 md:border-l-slate-200 dark:border-l-slate-800">
                                                <div className="text-xs text-slate-500 mb-1 dark:text-slate-400">Public Rating</div>
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-lg font-bold dark:text-slate-200">{record.stats.satisfaction || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>
                                      ) : (
                                          <div className="p-4 bg-slate-50 rounded border border-dashed text-sm text-slate-400 text-center dark:bg-slate-900/20 dark:border-slate-800 dark:text-slate-500">
                                              Historical performance data not digitized for this tenure.
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
            
          /* --- VIEW 2: DIRECTORY --- */
          <div className="animate-in fade-in duration-500">
             
            {/* Control Bar & Filters */}
            <div className="bg-white p-4 rounded-lg border shadow-sm mb-8 dark:bg-card dark:border-slate-800">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">Ward Directory</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Find your local authority and check their performance.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search wards..." 
                                value={query} 
                                onChange={(e) => setQuery(e.target.value)} 
                                className="pl-9 dark:bg-slate-950 dark:border-slate-800" 
                            />
                        </div>
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger className="w-full sm:w-40 dark:bg-slate-950 dark:border-slate-800"><SelectValue placeholder="City" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All Cities</SelectItem>{cities.map(city => (<SelectItem key={city} value={city}>{city}</SelectItem>))}</SelectContent>
                        </Select>
                        <Select value={selectedParty} onValueChange={setSelectedParty}>
                            <SelectTrigger className="w-full sm:w-40 dark:bg-slate-950 dark:border-slate-800"><SelectValue placeholder="Party" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All Parties</SelectItem>{parties.map(party => (<SelectItem key={party} value={party}>{party}</SelectItem>))}</SelectContent>
                        </Select>
                        {(query || selectedCity !== "All" || selectedParty !== "All") && (
                            <Button variant="ghost" size="icon" onClick={clearFilters} className="text-slate-500 dark:text-slate-400 dark:hover:text-white"><X className="h-4 w-4" /></Button>
                        )}
                    </div>
                </div>
            </div>

            {Object.keys(groupedWards).length === 0 ? (
                <div className="text-center py-20">
                    <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3 dark:text-slate-700" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No Wards Found</h3>
                    <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.entries(groupedWards).map(([city, wards]) => (
                        <div key={city}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold dark:bg-blue-900/30 dark:text-blue-400">{wards.length}</div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{city}</h2>
                                <Separator className="flex-1 dark:bg-slate-800" />
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {wards.map((ward) => (
                                    <Card 
                                        key={ward.id} 
                                        className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group border-t-4 border-t-transparent hover:border-t-blue-500 bg-white dark:bg-card dark:border-slate-800 dark:hover:border-t-blue-500" 
                                        onClick={() => selectWard(ward)}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="secondary" className="mb-2 text-[10px] font-normal tracking-wider uppercase dark:bg-slate-800 dark:text-slate-300">{ward.state}</Badge>
                                                <Landmark className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors dark:text-slate-600 dark:group-hover:text-blue-400" />
                                            </div>
                                            <CardTitle className="text-lg leading-tight group-hover:text-blue-700 transition-colors line-clamp-2 dark:text-slate-100 dark:group-hover:text-blue-400">{ward.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm text-slate-600 mb-4 space-y-2 dark:text-slate-400">
                                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded dark:bg-slate-900">
                                                    <User className="h-3.5 w-3.5 text-blue-500" /> 
                                                    <span className="truncate font-medium dark:text-slate-200">{ward.current_officer}</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded dark:bg-slate-900">
                                                    <Vote className="h-3.5 w-3.5 text-orange-500" /> 
                                                    <span className="truncate dark:text-slate-300">{ward.current_party}</span>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t text-xs text-slate-400 font-medium flex justify-between items-center group-hover:text-blue-600 transition-colors dark:border-slate-800 dark:group-hover:text-blue-400">
                                                <span>Compare Performance</span><ArrowLeft className="h-3 w-3 rotate-180" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}