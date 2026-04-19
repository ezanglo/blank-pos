import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DashboardBranchShell } from "@/components/dashboard-branch-shell"
import { DashboardKpiCards } from "@/components/dashboard-kpi-cards"
import { DashboardRecentSales, type DashboardRecentSaleRow } from "@/components/dashboard-recent-sales"
import { DashboardSalesChart } from "@/components/dashboard-sales-chart"
import { DashboardLowStockBanner } from "@/components/dashboard-low-stock-banner"
import { listInventoryBelowReorder } from "@/lib/queries/catalog"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import {
  fillDailySalesSeriesGaps,
  getDailySalesSeries,
  getDailySalesSummary,
  listRecentTransactionsForLocation,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  utcCalendarDayStartIso,
  utcTodayIsoDate,
} from "@/lib/queries/reports"
import { formatMinorToDecimal2 } from "@/lib/money"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}): Promise<Metadata> {
  const { businessSlug, locationSlug } = await params
  const session = await requireSession()
  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row) {
    return { title: "Dashboard" }
  }
  return {
    title: row.location.name,
    description: `Dashboard for ${row.location.name}.`,
  }
}

export default async function BusinessLocationDashboardPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}) {
  const { businessSlug, locationSlug } = await params
  const session = await requireSession()

  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row) notFound()

  const showManagerBlocks = row.member.role === "owner" || row.member.role === "manager"

  const todayIso = utcTodayIsoDate()
  const weekStartIso = utcCalendarDayStartIso(todayIso, 6)
  const chartStartIso = utcCalendarDayStartIso(todayIso, 13)

  if (!weekStartIso || !chartStartIso) notFound()

  const todayFrom = parseReportDayStartUtc(todayIso)
  const todayTo = parseReportDayEndUtc(todayIso)
  const weekFrom = parseReportDayStartUtc(weekStartIso)
  const weekTo = todayTo
  const chartFrom = parseReportDayStartUtc(chartStartIso)
  if (!todayFrom || !todayTo || !weekFrom || !weekTo || !chartFrom) notFound()

  const orgId = row.organization.id
  const locId = row.location.id

  let todaySummary = null
  let weekSummary = null
  let chartPoints: { day: string; grossMajor: number; transactions: number }[] = []
  let recentRows: Awaited<ReturnType<typeof listRecentTransactionsForLocation>> = []
  let belowReorder: Awaited<ReturnType<typeof listInventoryBelowReorder>> = []

  if (showManagerBlocks) {
    const [t, w, seriesRaw, recent, low] = await Promise.all([
      getDailySalesSummary(orgId, locId, todayFrom, todayTo),
      getDailySalesSummary(orgId, locId, weekFrom, weekTo),
      getDailySalesSeries(orgId, locId, chartFrom, todayTo),
      listRecentTransactionsForLocation(orgId, locId, 15),
      listInventoryBelowReorder(orgId),
    ])
    todaySummary = t
    weekSummary = w
    const filled = fillDailySalesSeriesGaps(seriesRaw, chartStartIso, todayIso)
    chartPoints = filled.map((d) => ({
      day: d.day,
      grossMajor: Number(d.grossSubtotalMinor) / 100,
      transactions: d.transactionCount,
    }))
    recentRows = recent
    belowReorder = low
  }

  return (
    <div className="space-y-8">
      <DashboardBranchShell
        locationName={row.location.name}
        businessSlug={businessSlug}
        locationSlug={locationSlug}
      />

      {!showManagerBlocks ? (
        <p className="text-muted-foreground text-sm">
          Sales summaries and reports are available to managers and owners. Use the register to take orders.
        </p>
      ) : null}

      {showManagerBlocks ? (
        <>
          <DashboardLowStockBanner businessSlug={businessSlug} items={belowReorder} />

          {todaySummary && weekSummary ? (
            <DashboardKpiCards
              todayIso={todayIso}
              weekStartIso={weekStartIso}
              weekEndIso={todayIso}
              todayTransactions={todaySummary.transactionCount}
              todayGross={formatMinorToDecimal2(todaySummary.grossSubtotalMinor)}
              todayAvgBasket={
                todaySummary.averageBasketMinor != null
                  ? formatMinorToDecimal2(todaySummary.averageBasketMinor)
                  : null
              }
              weekTransactions={weekSummary.transactionCount}
              weekGross={formatMinorToDecimal2(weekSummary.grossSubtotalMinor)}
              weekAvgBasket={
                weekSummary.averageBasketMinor != null
                  ? formatMinorToDecimal2(weekSummary.averageBasketMinor)
                  : null
              }
            />
          ) : null}

          <DashboardSalesChart data={chartPoints} />

          <DashboardRecentSales
            businessSlug={businessSlug}
            locationSlug={locationSlug}
            rows={recentRows.map(
              (r): DashboardRecentSaleRow => ({
                id: r.id,
                createdAtIso: r.createdAt.toISOString(),
                queueNumber: r.queueNumber,
                status: r.status,
                totalFormatted: formatMinorToDecimal2(r.totalMinor),
              }),
            )}
          />
        </>
      ) : null}
    </div>
  )
}
