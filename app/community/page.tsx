import { Header } from "@/components/header"
import { CommunityContent } from "@/components/community/community-content"

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CommunityContent />
    </div>
  )
}
