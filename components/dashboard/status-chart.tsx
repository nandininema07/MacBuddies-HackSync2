"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/context"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { Report } from "@/lib/types"

interface StatusChartProps {
  reports: Report[]
}

const statusColors = {
  pending: "hsl(220, 10%, 60%)",
  verified: "hsl(210, 70%, 50%)",
  in_progress: "hsl(270, 60%, 55%)",
  resolved: "hsl(140, 60%, 45%)",
  rejected: "hsl(0, 70%, 50%)",
}

export function StatusChart({ reports }: StatusChartProps) {
  const { t } = useI18n()

  const statusCounts: Record<string, number> = {}
  reports.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  })

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: t.status[status as keyof typeof t.status] || status,
    value: count,
    key: status,
  }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
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
        <CardTitle>Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
              {data.map((entry) => (
                <Cell key={entry.key} fill={statusColors[entry.key as keyof typeof statusColors] || "#888"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
