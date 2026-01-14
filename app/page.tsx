"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { useI18n } from "@/lib/i18n/context"
import { Camera, Map, BarChart3, Shield, Users, AlertTriangle, CheckCircle, TrendingUp, Building2 } from "lucide-react"

export default function HomePage() {
  const { t } = useI18n()

  const features = [
    {
      icon: Camera,
      title: "AI-Powered Detection",
      description:
        "Upload photos of infrastructure issues and our AI instantly classifies and assesses damage severity.",
    },
    {
      icon: Map,
      title: "Geospatial Mapping",
      description: "Visualize corruption hotspots across India with interactive heatmaps and clustering.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track reports, monitor resolutions, and analyze trends with comprehensive statistics.",
    },
    {
      icon: Users,
      title: "Community Petitions",
      description: "Create and sign petitions to mobilize community support and escalate critical issues.",
    },
  ]

  const stats = [
    { icon: AlertTriangle, value: "12,847", label: "Issues Reported" },
    { icon: CheckCircle, value: "3,291", label: "Issues Resolved" },
    { icon: TrendingUp, value: "₹847Cr", label: "Estimated Losses" },
    { icon: Building2, value: "234", label: "Cities Covered" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 lg:py-32">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              <span>Citizen-Powered Transparency</span>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{t.hero.title}</h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">{t.hero.subtitle}</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link href="/capture">
                  <Camera className="h-5 w-5" />
                  {t.hero.cta}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 bg-transparent">
                <Link href="/map">
                  <Map className="h-5 w-5" />
                  {t.hero.secondary}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="container px-4">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto h-8 w-8 text-primary mb-3" />
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How INTEGRITY Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A comprehensive platform for reporting and tracking infrastructure corruption
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-primary py-16 text-primary-foreground">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Users className="mx-auto h-12 w-12 mb-6 opacity-90" />
            <h2 className="text-3xl font-bold tracking-tight">Join the Movement</h2>
            <p className="mt-4 text-lg opacity-90">
              Thousands of citizens are already reporting infrastructure issues. Be part of the change.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/sign-up">{t.nav.signup}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10"
              >
                <Link href="/community">{t.nav.community}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold">INTEGRITY</span>
            </div>
            <p className="text-sm text-muted-foreground">Open source civic tech platform. Built for transparency.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
