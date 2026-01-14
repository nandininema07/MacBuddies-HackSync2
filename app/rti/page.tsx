import { Suspense } from "react"
import { Header } from "@/components/header"
import { RTIContent } from "@/components/rti/rti-content"

export const metadata = {
  title: "RTI & Complaints | INTEGRITY",
  description: "Generate RTI applications and complaint letters for infrastructure issues",
}

export default function RTIPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <RTIContent />
        </Suspense>
      </main>
    </div>
  )
}
