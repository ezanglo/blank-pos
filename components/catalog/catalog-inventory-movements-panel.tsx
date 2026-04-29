"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"

import { LinesSheetButton } from "@/components/transactions/lines-sheet-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { recordInventoryAdjustment } from "@/lib/actions/catalog-inventory"
import type { InventoryItemWithStock } from "@/lib/queries/catalog"
import type {
  InventoryMovementListFilters,
  InventoryMovementListRow,
} from "@/lib/queries/inventory-movements"
import { cn } from "@/lib/utils"

function buildQueryString(base: Record<string, string>, patch: Partial<Record<string, string>>) {
  const next = { ...base, ...patch }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(next)) {
    if (v !== "" && v != null) sp.set(k, v)
  }
  return sp.toString()
}

export function CatalogInventoryMovementsPanel({
  businessSlug,
  filters,
  rows,
  total,
  inventoryItems,
}: {
  businessSlug: string
  filters: InventoryMovementListFilters
  rows: InventoryMovementListRow[]
  total: number
  inventoryItems: InventoryItemWithStock[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const baseQs = useMemo(
    () => ({
      type: filters.type,
      search: filters.search,
      from: filters.dateFrom,
      to: filters.dateTo,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    }),
    [filters],
  )

  const pushFilters = useCallback(
    (patch: Partial<Record<string, string>>) => {
      const qs = buildQueryString(baseQs, patch)
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [baseQs, pathname, router],
  )

  const [typeDraft, setTypeDraft] = useState(filters.type)
  const [searchDraft, setSearchDraft] = useState(filters.search)
  const [fromDraft, setFromDraft] = useState(filters.dateFrom)
  const [toDraft, setToDraft] = useState(filters.dateTo)

  useEffect(() => {
    setTypeDraft(filters.type)
    setSearchDraft(filters.search)
    setFromDraft(filters.dateFrom)
    setToDraft(filters.dateTo)
  }, [filters.type, filters.search, filters.dateFrom, filters.dateTo])

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize) || 1)
  const hasPrev = filters.page > 1
  const hasNext = filters.page < totalPages

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjItemId, setAdjItemId] = useState("")
  const [adjDelta, setAdjDelta] = useState("")
  const [adjNote, setAdjNote] = useState("")
  const [adjError, setAdjError] = useState<string | null>(null)
  const [adjBusy, setAdjBusy] = useState(false)

  async function submitAdjustment() {
    setAdjBusy(true)
    setAdjError(null)
    try {
      const delta = Number.parseInt(adjDelta, 10)
      if (!Number.isFinite(delta) || delta === 0) throw new Error("Delta must be a non-zero whole number.")
      if (!adjItemId) throw new Error("Select an item.")
      await recordInventoryAdjustment(businessSlug, {
        inventoryItemId: adjItemId,
        delta,
        note: adjNote,
      })
      setAdjustOpen(false)
      setAdjItemId("")
      setAdjDelta("")
      setAdjNote("")
      router.refresh()
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : "Failed.")
    } finally {
      setAdjBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Stock movements</h1>
            <Link
              href={`/${businessSlug}/catalog/inventory`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to inventory
            </Link>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Audit log for sales deductions, adjustments, and receiving. Default range: last 7 days.
          </p>
        </div>
        <Button type="button" onClick={() => setAdjustOpen(true)} className="shrink-0 gap-1.5 self-start">
          <PlusIcon className="size-4" />
          Record adjustment
        </Button>
      </div>

      <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Field className="min-w-[140px]">
          <FieldLabel>Type</FieldLabel>
          <Select
            value={typeDraft || "all"}
            onValueChange={(v) => setTypeDraft(v === "all" || v == null ? "" : (v as InventoryMovementListFilters["type"]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in">In</SelectItem>
              <SelectItem value="out">Out</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field className="min-w-[140px]">
          <FieldLabel>From</FieldLabel>
          <Input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)} />
        </Field>
        <Field className="min-w-[140px]">
          <FieldLabel>To</FieldLabel>
          <Input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)} />
        </Field>
        <Field className="min-w-[180px] flex-1">
          <FieldLabel>Search</FieldLabel>
          <Input
            placeholder="Item or note…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            pushFilters({
              type: typeDraft,
              search: searchDraft,
              from: fromDraft,
              to: toDraft,
              page: "1",
            })
          }
        >
          Apply
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Sale</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No movements in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.movement.id}>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {r.movement.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">{r.movement.type}</TableCell>
                  <TableCell>{r.itemName}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.movement.quantity}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {r.movement.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.transactionId && r.locationSlug ? (
                      <LinesSheetButton
                        businessSlug={businessSlug}
                        locationSlug={r.locationSlug}
                        transactionId={r.transactionId}
                        trigger="text"
                        textLabel="Transaction"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.actorName ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          {total === 0
            ? "0 movements"
            : (() => {
                const from = (filters.page - 1) * filters.pageSize + 1
                const to = (filters.page - 1) * filters.pageSize + rows.length
                return `Showing ${from}–${to} of ${total}`
              })()}
        </p>
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev || pending}
              onClick={() => hasPrev && pushFilters({ page: String(filters.page - 1) })}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="text-foreground min-w-28 text-center text-xs tabular-nums">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext || pending}
              onClick={() => hasNext && pushFilters({ page: String(filters.page + 1) })}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record adjustment</DialogTitle>
            <DialogDescription>
              Signed delta (e.g. +5 or -2) with a required reason. Writes an adjustment movement and updates stock.
            </DialogDescription>
          </DialogHeader>
          {adjError ? (
            <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
              {adjError}
            </p>
          ) : null}
          <div className="grid gap-4">
            <Field>
              <FieldLabel>Item</FieldLabel>
              <Select value={adjItemId || undefined} onValueChange={(v) => setAdjItemId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((row) => (
                    <SelectItem key={row.item.id} value={row.item.id}>
                      {row.item.name} (on hand: {row.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Delta (whole units)</FieldLabel>
              <Input value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} inputMode="numeric" />
            </Field>
            <Field>
              <FieldLabel>Reason</FieldLabel>
              <Input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Spoilage, count correction…" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={adjBusy} onClick={submitAdjustment}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
