import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardDatePreset } from "@/lib/queries/reports"

function presetHint(preset: DashboardDatePreset): string {
  switch (preset) {
    case "daily":
      return "Selected day"
    case "weekly":
      return "Monday–Sunday week (UTC)"
    case "monthly":
      return "Full calendar month (UTC)"
    case "custom":
      return "Custom range"
  }
}

export function DashboardKpiCards({
  preset,
  fromStr,
  toStr,
  transactionCount,
  grossSubtotal,
  avgBasket,
}: {
  preset: DashboardDatePreset
  fromStr: string
  toStr: string
  transactionCount: number
  grossSubtotal: string
  avgBasket: string | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Transactions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{transactionCount}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          {fromStr} → {toStr} UTC · {presetHint(preset)}
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Gross subtotal</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{grossSubtotal}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">Tax excluded</CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg basket</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{avgBasket ?? "—"}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          {fromStr} → {toStr} UTC
        </CardFooter>
      </Card>
    </div>
  )
}
