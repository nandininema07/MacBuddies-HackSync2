"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { Report } from "@/lib/types"
import { format, subDays, startOfDay } from "date-fns"

interface TrendChartProps {
  reports: Report[]
}

export function TrendChart({ reports }: TrendChartProps) {
  // Generate last 7 days data
  const today = startOfDay(new Date())
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i)
    return {
      date: format(date, "MMM dd"),
      timestamp: date.getTime(),
      count: 0,
    }
  })

  // Count reports per day
  reports.forEach((report) => {
    const reportDate = startOfDay(new Date(report.created_at)).getTime()
    const dayEntry = last7Days.find((d) => d.timestamp === reportDate)
    if (dayEntry) {
      dayEntry.count++
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={last7Days} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
