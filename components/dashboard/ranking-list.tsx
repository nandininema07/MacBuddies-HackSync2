import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp } from "lucide-react"

export function RankingList({ topRisks }: { topRisks: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
           <TrendingUp className="h-5 w-5 text-red-500" />
           Top Priority Zones (Most Voted)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topRisks.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
               <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-600">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.city} • {item.department || "Public Works"}</p>
                  </div>
               </div>
               <div className="text-right">
                  <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100">
                    {item.upvotes} Votes
                  </Badge>
               </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}