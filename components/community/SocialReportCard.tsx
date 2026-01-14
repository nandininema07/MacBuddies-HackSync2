import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  Share2, 
  MapPin, 
  Clock 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

export function SocialReportCard({ report }: { report: any }) {
  // 1. Format date safely
  const timeAgo = report.created_at 
    ? formatDistanceToNow(new Date(report.created_at), { addSuffix: true })
    : "recently"

  // 2. YOU MUST RETURN THE JSX HERE
  return (
    <Card className="hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-200 cursor-pointer mb-4">
      <div className="flex">
        {/* LEFT: Voting Column */}
        <div className="w-12 bg-muted/30 border-r flex flex-col items-center py-3 gap-1 rounded-l-lg shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-orange-600 hover:bg-orange-100/20">
            <ArrowBigUp className="h-6 w-6" />
          </Button>
          <span className="text-xs font-bold">{report.upvotes || 0}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 hover:bg-blue-100/20">
            <ArrowBigDown className="h-6 w-6" />
          </Button>
        </div>

        {/* RIGHT: Content Column */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-full px-2">
              r/{report.category || "general"}
            </Badge>
            <span>•</span>
            <span className="flex items-center gap-1 truncate max-w-[100px] sm:max-w-none">
              <MapPin className="h-3 w-3" /> {report.city || "Unknown"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" /> {timeAgo}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="text-base sm:text-lg font-semibold leading-tight mb-2 text-foreground">
            {report.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {report.description}
          </p>

          {/* Image (Feed Style) */}
          {report.image_url && (
            <div className="relative w-full h-48 sm:h-80 mb-3 bg-muted rounded-md overflow-hidden border">
              <img 
                src={report.image_url} 
                alt="Evidence" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                 <Badge variant={report.severity === 'critical' ? 'destructive' : 'secondary'} className="shadow-sm">
                   {report.severity || "Medium"}
                 </Badge>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center gap-2 text-muted-foreground pt-1">
            <Button variant="ghost" size="sm" className="gap-2 h-8 px-2 hover:bg-muted">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">Discuss</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 h-8 px-2 hover:bg-muted">
              <Share2 className="h-4 w-4" />
              <span className="text-xs font-medium">Share</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}