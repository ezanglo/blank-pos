import { notFound } from "next/navigation"

import { transactionStatusLabels, transactionStatusValues } from "@/lib/db/schema-transactions"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import {
  getProductSalesForRange,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  parseTransactionStatusFilter,
} from "@/lib/queries/reports"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 7)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default async function ProductSalesPage({
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
  const def = defaultRange()
  const fromStr = typeof sp.from === "string" && sp.from ? sp.from : def.from
  const toStr = typeof sp.to === "string" && sp.to ? sp.to : def.to
  const statusParam = typeof sp.status === "string" && sp.status.length > 0 ? sp.status : "all"
  const status = parseTransactionStatusFilter(statusParam === "all" ? undefined : statusParam)
  const from = parseReportDayStartUtc(fromStr)
  const to = parseReportDayEndUtc(toStr)
  if (!from || !to) notFound()

  const products = await getProductSalesForRange(
    row.organization.id,
    row.location.id,
    from,
    to,
    status,
  )

  const csvQs = new URLSearchParams({ from: fromStr, to: toStr })
  if (statusParam !== "all") csvQs.set("status", statusParam)
  const csvHref = `/${businessSlug}/l/${locationSlug}/product-sales/csv?${csvQs.toString()}`

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={statusParam}
            className="border-input bg-background h-9 min-w-40 rounded-md border px-2 text-sm"
          >
            <option value="all">All</option>
            {transactionStatusValues.map((s) => (
              <option key={s} value={s}>
                {transactionStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
        >
          Apply
        </button>
        <a
          href={csvHref}
          className="border-input bg-background text-foreground inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
        >
          Download CSV
        </a>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium">Product</th>
              <th className="p-3 text-right font-medium">Units</th>
              <th className="p-3 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground p-6 text-center">
                  No line items in this range.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.productId} className="border-t">
                  <td className="p-3">{p.productName}</td>
                  <td className="p-3 text-right tabular-nums">{p.unitsSold}</td>
                  <td className="p-3 text-right tabular-nums">{formatMinorToDecimal2(p.revenueMinor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
