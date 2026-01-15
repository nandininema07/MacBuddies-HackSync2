import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { AlertTriangle, TrendingUp, ArrowRight, MapPin, Building2 } from "lucide-react"
import Link from "next/link"

export function RankingList({ topRisks }: { topRisks: any[] }) {
  // Sort by votes strictly
  const sortedRisks = [...topRisks].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <Card className="h-full border-l-4 border-l-red-500 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
           <TrendingUp className="h-5 w-5 text-red-500" />
           Most Voted Issues
        </CardTitle>
        <p className="text-xs text-muted-foreground">
            Ranked by community impact. High votes indicate urgent attention needed.
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {sortedRisks.length === 0 ? (
             <div className="p-6 text-center text-muted-foreground text-sm">No votes yet.</div>
          ) : (
            sortedRisks.map((item, index) => (
                <div key={item.id} className="p-4 border-b hover:bg-slate-50 transition-colors group">
                    
                    {/* Header: Rank & Votes */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}
                            `}>
                                #{index + 1}
                            </div>
                            <Badge variant={item.risk_level === 'High' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                                {item.risk_level || 'Pending'} Risk
                            </Badge>
                        </div>
                        <span className="text-xs font-bold text-blue-600">
                            {item.upvotes} Votes
                        </span>
                    </div>

                    {/* Content: Title & Location */}
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">{item.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3" />
                        {item.city}
                    </div>

                    {/* ACTION: Ward Link */}
                    <Link href={`/wards?search=${item.city}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 justify-between group-hover:border-blue-300 group-hover:text-blue-700">
                            <span className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {item.department || "Municipal Ward"}
                            </span>
                            <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                        </Button>
                    </Link>

                </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}