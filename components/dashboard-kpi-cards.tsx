import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DashboardKpiCards({
  todayIso,
  weekStartIso,
  weekEndIso,
  todayTransactions,
  todayGross,
  todayAvgBasket,
  weekTransactions,
  weekGross,
  weekAvgBasket,
}: {
  todayIso: string
  weekStartIso: string
  weekEndIso: string
  todayTransactions: number
  todayGross: string
  todayAvgBasket: string | null
  weekTransactions: number
  weekGross: string
  weekAvgBasket: string | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Transactions today</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{todayTransactions}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">UTC {todayIso}</CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Gross subtotal today</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{todayGross}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          Avg basket: {todayAvgBasket ?? "—"} · tax excluded
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Transactions (7d)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{weekTransactions}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          {weekStartIso} → {weekEndIso} UTC
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Gross subtotal (7d)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{weekGross}</CardTitle>
        </CardHeader>
        <CardFooter className="text-muted-foreground text-xs">
          Avg basket: {weekAvgBasket ?? "—"} · tax excluded
        </CardFooter>
      </Card>
    </div>
  )
}
