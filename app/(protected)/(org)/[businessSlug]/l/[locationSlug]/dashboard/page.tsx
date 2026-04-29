import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DashboardBranchShell } from "@/components/dashboard-branch-shell"
import { DashboardDateRangeFilter } from "@/components/dashboard-date-range-filter"
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
  listRecentTransactionsForLocationInRange,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  resolveDashboardUtcDateRangeFromQuery,
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
  searchParams,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  const sp = await searchParams
  const resolved = resolveDashboardUtcDateRangeFromQuery(sp)
  if (!resolved) notFound()

  const { preset, fromStr, toStr } = resolved
  const rangeFrom = parseReportDayStartUtc(fromStr)
  const rangeTo = parseReportDayEndUtc(toStr)
  if (!rangeFrom || !rangeTo) notFound()

  const anchorParam = typeof sp.anchor === "string" ? sp.anchor.trim() : ""
  const anchorOk =
    /^\d{4}-\d{2}-\d{2}$/.test(anchorParam) && parseReportDayStartUtc(anchorParam) != null
  const anchorForForm = preset === "custom" ? utcTodayIsoDate() : anchorOk ? anchorParam : utcTodayIsoDate()

  const dashboardPath = `/${businessSlug}/l/${locationSlug}/dashboard`
  const chartRangeDescription = `${fromStr} → ${toStr} (UTC)`

  const orgId = row.organization.id
  const locId = row.location.id

  let periodSummary = null
  let chartPoints: { day: string; grossMajor: number; transactions: number }[] = []
  let recentRows: Awaited<ReturnType<typeof listRecentTransactionsForLocationInRange>> = []
  let belowReorder: Awaited<ReturnType<typeof listInventoryBelowReorder>> = []

  if (showManagerBlocks) {
    const [summary, seriesRaw, recent, low] = await Promise.all([
      getDailySalesSummary(orgId, locId, rangeFrom, rangeTo),
      getDailySalesSeries(orgId, locId, rangeFrom, rangeTo),
      listRecentTransactionsForLocationInRange(orgId, locId, rangeFrom, rangeTo, 15),
      listInventoryBelowReorder(orgId),
    ])
    periodSummary = summary
    const filled = fillDailySalesSeriesGaps(seriesRaw, fromStr, toStr)
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
          <DashboardDateRangeFilter
            actionPath={dashboardPath}
            preset={preset}
            anchorDefault={anchorForForm}
            customFrom={fromStr}
            customTo={toStr}
          />

          <DashboardLowStockBanner businessSlug={businessSlug} items={belowReorder} />

          {periodSummary ? (
            <DashboardKpiCards
              preset={preset}
              fromStr={fromStr}
              toStr={toStr}
              transactionCount={periodSummary.transactionCount}
              grossSubtotal={formatMinorToDecimal2(periodSummary.grossSubtotalMinor)}
              avgBasket={
                periodSummary.averageBasketMinor != null
                  ? formatMinorToDecimal2(periodSummary.averageBasketMinor)
                  : null
              }
            />
          ) : null}

          <DashboardSalesChart data={chartPoints} rangeDescription={chartRangeDescription} />

          <DashboardRecentSales
            businessSlug={businessSlug}
            locationSlug={locationSlug}
            rows={recentRows.map(
              (r): DashboardRecentSaleRow => ({
                id: r.id,
                createdAtIso: r.createdAt.toISOString(),
                queueNumber: r.queueNumber,
                customerCallName: r.customerCallName,
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
