import { notFound } from "next/navigation"

import { ProductSalesPageSizeForm } from "@/components/product-sales/product-sales-page-size-form"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { transactionStatusLabels, transactionStatusValues } from "@/lib/db/schema-transactions"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import {
  listProductSalesForRangePage,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  parseTransactionStatusFilter,
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

function buildPageItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, idx) => idx + 1)

  const out: Array<number | "ellipsis"> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) out.push("ellipsis")
  for (let p = start; p <= end; p++) out.push(p)
  if (end < totalPages - 1) out.push("ellipsis")

  out.push(totalPages)
  return out
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
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "", 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "", 10) || 10),
  )
  const from = parseReportDayStartUtc(fromStr)
  const to = parseReportDayEndUtc(toStr)
  if (!from || !to) notFound()

  const { rows: products, total } = await listProductSalesForRangePage(
    row.organization.id,
    row.location.id,
    from,
    to,
    page,
    pageSize,
    status,
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageItems = buildPageItems(page, totalPages)

  const qsBase = (p: number) => {
    const u = new URLSearchParams({
      from: fromStr,
      to: toStr,
      page: String(p),
      pageSize: String(pageSize),
    })
    if (statusParam !== "all") u.set("status", statusParam)
    return `?${u.toString()}`
  }

  const csvQs = new URLSearchParams({ from: fromStr, to: toStr })
  if (statusParam !== "all") csvQs.set("status", statusParam)
  const csvHref = `/${businessSlug}/l/${locationSlug}/product-sales/csv?${csvQs.toString()}`

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

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>{total === 0 ? "0 products" : `Page ${page} of ${totalPages} (${total} products)`}</p>
        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ProductSalesPageSizeForm
              fromStr={fromStr}
              toStr={toStr}
              statusParam={statusParam}
              pageSize={pageSize}
            />
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`/${businessSlug}/l/${locationSlug}/product-sales${qsBase(Math.max(1, page - 1))}`}
                    aria-disabled={page <= 1}
                    className={cn(page <= 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {pageItems.map((item, idx) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={`/${businessSlug}/l/${locationSlug}/product-sales${qsBase(item)}`}
                        isActive={item === page}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href={`/${businessSlug}/l/${locationSlug}/product-sales${qsBase(Math.min(totalPages, page + 1))}`}
                    aria-disabled={page >= totalPages}
                    className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>
    </div>
  )
}
