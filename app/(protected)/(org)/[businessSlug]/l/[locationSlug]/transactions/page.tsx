import { notFound } from "next/navigation"

import { VoidTransactionButton } from "@/components/reports/void-transaction-button"
import { LinesSheetButton } from "@/components/transactions/lines-sheet-button"
import { ReceiptSheetButton } from "@/components/transactions/receipt-sheet-button"
import { TransactionsPageSizeForm } from "@/components/transactions/transactions-page-size-form"
import { buttonVariants } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  formatTransactionStatus,
  transactionStatusLabels,
  transactionStatusValues,
} from "@/lib/db/schema-transactions"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { formatOrderNumberLabel, parseTransactionOrderSearch } from "@/lib/format-order-number"
import {
  listTransactionsForLocationPage,
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

export default async function TransactionsPage({
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
  const orderRaw = typeof sp.order === "string" ? sp.order : ""
  const orderFilter = parseTransactionOrderSearch(orderRaw)
  const orderTrim = orderRaw.trim()
  const nameSearch = orderFilter || !orderTrim ? null : orderTrim

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
    status,
    orderFilter,
    nameSearch,
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
    if (orderRaw.trim()) u.set("order", orderRaw.trim())
    return `?${u.toString()}`
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end" method="get">
        <input type="hidden" name="page" value="1" />
        <div className="grid grid-cols-2 gap-3 md:contents">
          <label className="grid min-w-0 gap-1 text-sm">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="border-input bg-background h-9 min-w-0 rounded-md border px-2 text-sm"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="border-input bg-background h-9 min-w-0 rounded-md border px-2 text-sm"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm md:min-w-40">
          <span className="text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={statusParam}
            className="border-input bg-background h-9 min-w-0 rounded-md border px-2 text-sm md:min-w-40"
          >
            <option value="all">All</option>
            {transactionStatusValues.map((s) => (
              <option key={s} value={s}>
                {transactionStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 flex-1 gap-1 text-sm md:min-w-48 lg:min-w-56">
          <span className="text-muted-foreground">Order # / name</span>
          <input
            type="search"
            name="order"
            defaultValue={orderRaw}
            placeholder="OR-…, queue #, or name for order"
            autoComplete="off"
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-9 shrink-0 rounded-md px-3 text-sm font-medium md:w-auto"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="hidden p-2 text-left font-medium md:table-cell md:p-3">When</th>
              <th className="p-2 text-left font-medium md:p-3">
                <span className="md:hidden">Order</span>
                <span className="hidden md:inline">#</span>
              </th>
              <th className="hidden p-2 text-left font-medium md:table-cell md:p-3">Name for order</th>
              <th className="hidden p-2 text-left font-medium md:table-cell md:p-3">Status</th>
              <th className="p-2 text-right font-medium md:p-3">Total</th>
              <th className="p-2 text-right font-medium md:p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-4 text-center md:p-6">
                  {orderFilter
                    ? "No transactions match this order in the selected range."
                    : nameSearch
                      ? "No transactions match this name in the selected range."
                      : "No transactions in this range."}
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="hidden whitespace-nowrap p-2 tabular-nums md:table-cell md:p-3">
                    {t.createdAt.toLocaleString()}
                  </td>
                  <td className="p-2 tabular-nums md:p-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{formatOrderNumberLabel(t.createdAt, t.queueNumber)}</span>
                      <span className="text-muted-foreground text-xs font-normal md:hidden">
                        {formatTransactionStatus(t.status)}
                      </span>
                    </div>
                  </td>
                  <td
                    className="text-muted-foreground hidden max-w-48 truncate p-2 md:table-cell md:p-3"
                    title={t.customerCallName ?? undefined}
                  >
                    {t.customerCallName?.trim() ? t.customerCallName.trim() : "—"}
                  </td>
                  <td className="hidden p-2 md:table-cell md:p-3">{formatTransactionStatus(t.status)}</td>
                  <td className="p-2 text-right tabular-nums md:p-3">{formatMinorToDecimal2(t.totalMinor)}</td>
                  <td className="p-2 text-right md:p-3">
                    <div className="flex flex-nowrap items-center justify-end gap-1 md:flex-wrap md:gap-1.5">
                      <LinesSheetButton
                        businessSlug={businessSlug}
                        locationSlug={locationSlug}
                        transactionId={t.id}
                        trigger="icon"
                      />
                      <ReceiptSheetButton
                        businessSlug={businessSlug}
                        locationSlug={locationSlug}
                        transactionId={t.id}
                        trigger="icon"
                      />
                      <VoidTransactionButton
                        businessSlug={businessSlug}
                        locationSlug={locationSlug}
                        transactionId={t.id}
                        transactionStatus={t.status}
                        confirmOrderLabel={formatOrderNumberLabel(t.createdAt, t.queueNumber)}
                        trigger="icon"
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <p className="shrink-0">{total === 0 ? "0 transactions" : `Page ${page} of ${totalPages} (${total} total)`}</p>
        {total > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <TransactionsPageSizeForm
              fromStr={fromStr}
              toStr={toStr}
              statusParam={statusParam}
              orderRaw={orderRaw}
              pageSize={pageSize}
            />
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`/${businessSlug}/l/${locationSlug}/transactions${qsBase(Math.max(1, page - 1))}`}
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
                        href={`/${businessSlug}/l/${locationSlug}/transactions${qsBase(item)}`}
                        isActive={item === page}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href={`/${businessSlug}/l/${locationSlug}/transactions${qsBase(Math.min(totalPages, page + 1))}`}
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
