import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import {
  listTransactionsForLocationPage,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
} from "@/lib/queries/reports"
import { requireSession } from "@/lib/server-auth"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 7)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default async function ReportsTransactionsPage({
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
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "", 10) || 1)
  const pageSize = 25

  const from = parseReportDayStartUtc(fromStr)
  const to = parseReportDayEndUtc(toStr)
  if (!from || !to) notFound()

  const { rows, total } = await listTransactionsForLocationPage(
    row.organization.id,
    row.location.id,
    from,
    to,
    page,
    pageSize,
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const qsBase = (p: number) => {
    const u = new URLSearchParams({ from: fromStr, to: toStr, page: String(p) })
    return `?${u.toString()}`
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="page" value="1" />
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
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium">When</th>
              <th className="p-3 text-left font-medium">#</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Total</th>
              <th className="p-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
                  No transactions in this range.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 whitespace-nowrap tabular-nums">{t.createdAt.toLocaleString()}</td>
                  <td className="p-3 tabular-nums">{t.queueNumber ?? "—"}</td>
                  <td className="p-3 capitalize">{t.status}</td>
                  <td className="p-3 text-right tabular-nums">{formatMinorToDecimal2(t.totalMinor)}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/${businessSlug}/l/${locationSlug}/pos/receipt/${t.id}`}
                      className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                    >
                      Receipt
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          {total === 0 ? "0 transactions" : `Page ${page} of ${totalPages} (${total} total)`}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/${businessSlug}/l/${locationSlug}/reports/transactions${qsBase(page - 1)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/${businessSlug}/l/${locationSlug}/reports/transactions${qsBase(page + 1)}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
