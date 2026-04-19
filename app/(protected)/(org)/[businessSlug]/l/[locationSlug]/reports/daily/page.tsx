import { notFound } from "next/navigation"

import { getDailySalesSummary, parseReportDayEndUtc, parseReportDayStartUtc } from "@/lib/queries/reports"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { formatMinorToDecimal2 } from "@/lib/money"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function parseDate(sp: Record<string, string | string[] | undefined>): string {
  const v = sp.date
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10)
}

export default async function ReportsDailyPage({
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

  const sp = await searchParams
  const day = parseDate(sp)
  const from = parseReportDayStartUtc(day)
  const to = parseReportDayEndUtc(day)
  if (!from || !to) notFound()

  const summary = await getDailySalesSummary(row.organization.id, row.location.id, from, to)

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={day}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">Transactions</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.transactionCount}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">Gross subtotal</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMinorToDecimal2(summary.grossSubtotalMinor)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">Avg basket (subtotal)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.averageBasketMinor != null
              ? formatMinorToDecimal2(summary.averageBasketMinor)
              : "—"}
          </p>
        </div>
      </div>
    </div>
  )
}
