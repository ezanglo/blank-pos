"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  grossMajor: {
    label: "Gross subtotal",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export type DashboardSalesChartPoint = {
  /** YYYY-MM-DD */
  day: string
  /** Major units for chart scale (minor / 100) */
  grossMajor: number
  transactions: number
}

export function DashboardSalesChart({ data }: { data: DashboardSalesChartPoint[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily gross subtotal</CardTitle>
          <CardDescription>Last 14 days (UTC)</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">No data in range.</CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    tick: d.day.slice(5),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily gross subtotal</CardTitle>
        <CardDescription>Last 14 days (UTC), tax excluded</CardDescription>
      </CardHeader>
      <CardContent className="pl-0">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as DashboardSalesChartPoint | undefined
                    return row?.day ?? ""
                  }}
                />
              }
            />
            <defs>
              <linearGradient id="fillDashboardGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-grossMajor)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-grossMajor)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="grossMajor"
              type="natural"
              fill="url(#fillDashboardGross)"
              fillOpacity={0.4}
              stroke="var(--color-grossMajor)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
