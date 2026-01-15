"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  User, 
  FileText, 
  Loader2, 
  MapPin,
  Construction,
  CheckCircle2,
  Clock
} from "lucide-react"

// Same mapping for consistency
const WARD_NAMES: Record<string, string> = {
  "A": "Colaba, Fort", "B": "Sandhurst Road", "C": "Marine Lines", "D": "Grant Road",
  "E": "Byculla", "F/N": "Matunga", "F/S": "Parel", "G/N": "Dadar", "G/S": "Worli",
  "H/E": "Santacruz (E)", "H/W": "Bandra (W)", "K/E": "Andheri (E)", "K/W": "Andheri (W)",
  "L": "Kurla", "M/E": "Chembur (E)", "M/W": "Chembur (W)", "N": "Ghatkopar",
  "P/N": "Malad", "P/S": "Goregaon", "R/C": "Borivali", "R/N": "Dahisar",
  "R/S": "Kandivali", "S": "Bhandup", "T": "Mulund"
}

interface Project {
  id: string
  title: string
  contractor: string
  status: string
  progress_percent: number
  start_date: string
  end_date: string
  work_code: string
  work_type: string
}

export default function WardDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  // 1. Decode Ward ID (Handle special chars like / in F/N)
  const wardId = decodeURIComponent(params.wardId as string)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")

  useEffect(() => {
    const fetchProjects = async () => {
      // 2. Fetch projects specific to this Ward
      const { data, error } = await supabase
        .from('government_projects')
        .select('*')
        .eq('ward', wardId)
        .order('progress_percent', { ascending: false })

      if (!error && data) {
        setProjects(data)
        setFilteredProjects(data)
      }
      setIsLoading(false)
    }
    fetchProjects()
  }, [wardId])

  // 3. Search & Filter Logic
  useEffect(() => {
    let result = projects
    if (searchQuery) {
      result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (filterStatus !== "All") {
        if (filterStatus === "Active") result = result.filter(p => p.status === "In Progress")
        if (filterStatus === "Completed") result = result.filter(p => p.status === "Completed")
        if (filterStatus === "Pending") result = result.filter(p => p.status === "Not Started")
    }
    setFilteredProjects(result)
  }, [searchQuery, filterStatus, projects])

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-100 text-green-700 border-green-200'
    if (status === 'In Progress') return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-orange-100 text-orange-700 border-orange-200'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Completed') return <CheckCircle2 className="h-4 w-4" />
    if (status === 'In Progress') return <Construction className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container px-4 py-8 max-w-5xl mx-auto">
        
        {/* Header Navigation */}
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Wards
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-1">
                <MapPin className="h-5 w-5" />
                <span className="uppercase tracking-widest text-sm">Ward {wardId}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{WARD_NAMES[wardId] || `Ward ${wardId} Projects`}</h1>
            <p className="text-slate-500 mt-1">
                Found {projects.length} official government works recorded in this area.
            </p>
          </div>
          
          {/* Stats Summary */}
          <div className="flex gap-2">
             <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-center">
                <div className="text-2xl font-bold text-blue-600">{projects.filter(p => p.status === 'In Progress').length}</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">Active</div>
             </div>
             <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-center">
                <div className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'Completed').length}</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">Done</div>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search by road or project name..." 
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {['All', 'Active', 'Completed', 'Pending'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                            filterStatus === status 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {/* Project List */}
        {isLoading ? (
            <div className="flex flex-col items-center py-20 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p>Fetching government records...</p>
            </div>
        ) : filteredProjects.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-slate-50">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Projects Found</h3>
                <p className="text-slate-500">Try adjusting your search terms.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {filteredProjects.map((project) => (
                    <Card key={project.id} className="hover:border-blue-400 transition-colors">
                        <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                
                                {/* Left: Title & Meta */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between md:justify-start gap-3 mb-2">
                                        <Badge variant="outline" className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold ${getStatusColor(project.status)}`}>
                                            {getStatusIcon(project.status)}
                                            {project.status}
                                        </Badge>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                            {project.work_code}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-slate-800 mb-2 leading-snug">
                                        {project.title}
                                    </h3>
                                    
                                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <span className="font-medium">{project.contractor || "Contractor N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <span>
                                                {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'} 
                                                {' '}&rarr;{' '} 
                                                {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Progress */}
                                <div className="w-full md:w-48 flex flex-col justify-center">
                                    <div className="flex justify-between text-sm font-bold text-slate-700 mb-1.5">
                                        <span>Progress</span>
                                        <span>{project.progress_percent}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                project.progress_percent === 100 ? 'bg-green-500' : 'bg-blue-500'
                                            }`} 
                                            style={{ width: `${project.progress_percent}%` }} 
                                        />
                                    </div>
                                    <div className="mt-2 text-xs text-right text-slate-400">
                                        Type: {project.work_type}
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </main>
    </div>
  )
}