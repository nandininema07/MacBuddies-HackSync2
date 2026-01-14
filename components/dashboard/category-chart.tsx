"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface CategoryChartProps {
  categoryCounts: Record<string, number>
}

const categoryColors: Record<string, string> = {
  road: "hsl(var(--chart-1))",
  bridge: "hsl(var(--chart-2))",
  building: "hsl(var(--chart-3))",
  drainage: "hsl(var(--chart-4))",
  electrical: "hsl(var(--chart-5))",
  water: "hsl(210, 70%, 50%)",
  other: "hsl(0, 0%, 60%)",
}

export function CategoryChart({ categoryCounts }: CategoryChartProps) {
  const { t } = useI18n()

  const data = Object.entries(categoryCounts).map(([category, count]) => ({
    category: t.categories[category as keyof typeof t.categories] || category,
    count,
    key: category,
  }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.categoryBreakdown}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.categoryBreakdown}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" />
            <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={categoryColors[entry.key] || categoryColors.other} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
