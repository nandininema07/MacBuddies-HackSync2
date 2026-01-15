"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { Loader2, MapPin, TrendingUp, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

const WARD_NAMES: Record<string, string> = {
  "A": "Colaba, Fort", "B": "Sandhurst Road", "C": "Marine Lines", "D": "Grant Road",
  "E": "Byculla", "F/N": "Matunga", "F/S": "Parel", "G/N": "Dadar", "G/S": "Worli",
  "H/E": "Santacruz (E)", "H/W": "Bandra (W)", "K/E": "Andheri (E)", "K/W": "Andheri (W)",
  "L": "Kurla", "M/E": "Chembur (E)", "M/W": "Chembur (W)", "N": "Ghatkopar",
  "P/N": "Malad", "P/S": "Goregaon", "R/C": "Borivali", "R/N": "Dahisar",
  "R/S": "Kandivali", "S": "Bhandup", "T": "Mulund"
}

interface WardStats {
  ward: string; total: number; completed: number; inProgress: number; notStarted: number; avgProgress: number
}

export default function WardsPage() {
  const [stats, setStats] = useState<WardStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchWardData = async () => {
      const { data } = await supabase.from('government_projects').select('ward, status, progress_percent')
      const wardMap: Record<string, WardStats> = {}

      data?.forEach((project) => {
        const ward = project.ward || "Unknown"
        if (!wardMap[ward]) wardMap[ward] = { ward, total: 0, completed: 0, inProgress: 0, notStarted: 0, avgProgress: 0 }
        const w = wardMap[ward]
        w.total += 1
        w.avgProgress += (project.progress_percent || 0)
        const status = (project.status || "").toLowerCase()
        if (status.includes("completed")) w.completed += 1
        else if (status.includes("progress")) w.inProgress += 1
        else w.notStarted += 1
      })

      setStats(Object.values(wardMap).map(w => ({ ...w, avgProgress: w.total > 0 ? Math.round(w.avgProgress / w.total) : 0 })).sort((a, b) => a.ward.localeCompare(b.ward)))
      setIsLoading(false)
    }
    fetchWardData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <main className="container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mumbai Ward Overview</h1>
          <p className="text-muted-foreground">Select a ward to view detailed government project lists.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stats.map((ward) => (
              // LINK WRAPPER ADDED HERE
              <Link key={ward.ward} href={`/wards/${encodeURIComponent(ward.ward)}`}>
                <Card className="group hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer h-full">
                  <CardHeader className="pb-3 bg-white rounded-t-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> WARD {ward.ward}
                        </div>
                        <CardTitle className="text-lg font-bold">{WARD_NAMES[ward.ward] || `Ward ${ward.ward}`}</CardTitle>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-600">
                        <span>Overall Progress</span>
                        <span>{ward.avgProgress}%</span>
                      </div>
                      <Progress value={ward.avgProgress} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2 rounded border">
                      <div><div className="font-bold text-green-600 text-lg">{ward.completed}</div><div className="text-slate-500 scale-90">Done</div></div>
                      <div className="border-x border-slate-200"><div className="font-bold text-blue-600 text-lg">{ward.inProgress}</div><div className="text-slate-500 scale-90">Active</div></div>
                      <div><div className="font-bold text-orange-500 text-lg">{ward.notStarted}</div><div className="text-slate-500 scale-90">Pending</div></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}