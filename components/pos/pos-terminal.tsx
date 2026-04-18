"use client"

import {
  ChefHatIcon,
  FileTextIcon,
  Layers2Icon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  StoreIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import * as React from "react"
import { toast } from "sonner"

import { loadPosReceiptPreview } from "@/lib/actions/pos-receipt"
import { PosAddonsDialog } from "@/components/pos/pos-addons-dialog"
import { PosPricePickerDialog } from "@/components/pos/pos-price-picker-dialog"
import { PosReceiptDocument } from "@/components/pos/pos-receipt-document"
import { PrintReceiptButton } from "@/components/pos/print-receipt-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSale } from "@/lib/actions/sales"
import type { ProductCategoryRow } from "@/lib/db/schema-catalog"
import { transactionPaymentMethodValues } from "@/lib/db/schema-transactions"
import {
  formatMinorToDecimal2,
  parseMinorFromSerialized,
  sumMinor,
} from "@/lib/money"
import {
  posCartAddonSignature,
  posCartInstructionSignature,
} from "@/lib/pos/pos-addon-signature"
import type { PosProductCard } from "@/lib/pos/pos-types"
import type { PosCategoryInstruction } from "@/lib/queries/catalog"
import type { PosCategoryAddon } from "@/lib/queries/catalog-addons"
import type { PosReceiptPreviewModel } from "@/lib/pos/receipt-preview"
import { usePosCartStore, type PosCartLine } from "@/lib/stores/pos-cart-store"
import { cn } from "@/lib/utils"

function formatCartPrepEstimate(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.max(1, Math.round(seconds / 60))
    return `~${m} min`
  }
  return `~${seconds}s`
}

const PAYMENT_METHOD_LABEL: Record<
  (typeof transactionPaymentMethodValues)[number],
  string
> = {
  cash: "Cash",
  card_placeholder: "Card (not processed)",
}

function lineSubtotalMinor(line: PosCartLine): bigint {
  const base =
    parseMinorFromSerialized(line.unitPriceMinor) * BigInt(line.quantity)
  let add = BigInt(0)
  for (const a of line.addons) {
    add +=
      parseMinorFromSerialized(a.unitPriceMinor) *
      BigInt(a.quantity) *
      BigInt(line.quantity)
  }
  return base + add
}

/** Matches Tailwind `lg:` (1024px). Initial `false` keeps SSR + first paint aligned; updates in useLayoutEffect. */
function useViewportMinLg() {
  const [isLg, setIsLg] = React.useState(false)
  React.useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const apply = () => setIsLg(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return isLg
}

function LastReceiptBadge({
  transactionId,
  onOpen,
  compact,
}: {
  transactionId: string | null
  onOpen: () => void
  /** Narrow toolbar: shorter label */
  compact?: boolean
}) {
  if (!transactionId) return null
  return (
    <Badge
      variant="secondary"
      render={<button type="button" />}
      className={cn(
        "h-7 max-w-[min(100%,12rem)] shrink-0 cursor-pointer truncate px-2 py-0 text-[11px] font-semibold sm:h-6 sm:text-xs",
        compact && "max-w-36 sm:max-w-48",
      )}
      title="Open last sale receipt for this branch"
      aria-label="Open receipt for last sale at this branch"
      onClick={onOpen}
    >
      <FileTextIcon data-icon="inline-start" className="size-3 shrink-0" />
      {compact ? <span className="truncate">Receipt</span> : <span className="truncate">Last receipt</span>}
    </Badge>
  )
}

type PosCartPanelInnerProps = {
  lines: PosCartLine[]
  products: PosProductCard[]
  addonsByCategory: Record<string, PosCategoryAddon[]>
  instructionsByCategory: Record<string, PosCategoryInstruction[]>
  cartAnnounce: string
  grandMinor: bigint
  estimatedPrepLabel: string | null
  customerCallName: string
  setCustomerCallName: (v: string) => void
  paymentMethod: (typeof transactionPaymentMethodValues)[number]
  setPaymentMethod: (v: (typeof transactionPaymentMethodValues)[number]) => void
  submitting: boolean
  onCheckout: () => void
  onCloseCart: () => void
  lastOrderTransactionId: string | null
  onOpenLastReceipt: () => void
  removeLine: (key: string) => void
  setQuantity: (key: string, qty: number) => void
  setLineOptionsEdit: React.Dispatch<
    React.SetStateAction<null | { lineKey: string; variant: "addons" | "instructions" }>
  >
}

function PosCartPanelInner({
  lines,
  products,
  addonsByCategory,
  instructionsByCategory,
  cartAnnounce,
  grandMinor,
  estimatedPrepLabel,
  customerCallName,
  setCustomerCallName,
  paymentMethod,
  setPaymentMethod,
  submitting,
  onCheckout,
  onCloseCart,
  lastOrderTransactionId,
  onOpenLastReceipt,
  removeLine,
  setQuantity,
  setLineOptionsEdit,
}: PosCartPanelInnerProps) {
  const payFieldId = React.useId()
  const callNameFieldId = React.useId()

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 pb-2">
        <h2 className="text-base font-semibold tracking-tight">Cart</h2>
        <LastReceiptBadge transactionId={lastOrderTransactionId} onOpen={onOpenLastReceipt} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-11 shrink-0 rounded-xl"
          aria-label="Close cart"
          onClick={onCloseCart}
        >
          <XIcon />
        </Button>
      </div>

      <div aria-live="polite" aria-atomic className="sr-only">
        {cartAnnounce}
      </div>

      {lines.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center px-1 py-4">
          <p className="text-center text-sm leading-snug text-muted-foreground">
            Tap a product, choose price and quantity. To change price, remove the line and add again.
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
          {lines.map((line) => {
            const sub = lineSubtotalMinor(line)
            const unit = formatMinorToDecimal2(parseMinorFromSerialized(line.unitPriceMinor))
            const pCard = products.find((p) => p.id === line.productId)
            const addonChoices = pCard
              ? (addonsByCategory[pCard.categoryId] ?? []).filter((a) => a.currency === line.currency)
              : []
            const instructionChoices = pCard ? (instructionsByCategory[pCard.categoryId] ?? []) : []
            const showAddonBtn = addonChoices.length > 0
            const showInstrBtn = instructionChoices.length > 0
            return (
              <li
                key={line.key}
                className="rounded-lg border border-border/80 bg-background/90 px-2.5 py-2 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold">
                      {line.productName}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {showAddonBtn ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Add-ons"
                          className={cn(
                            "size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground",
                            line.addons.length > 0 && "text-primary",
                          )}
                          onClick={() =>
                            setLineOptionsEdit({ lineKey: line.key, variant: "addons" })
                          }
                          aria-label={`Add-ons for ${line.productName}`}
                        >
                          <Layers2Icon className="size-4" />
                        </Button>
                      ) : null}
                      {showInstrBtn ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Special instructions"
                          className={cn(
                            "size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground",
                            line.instructions.length > 0 && "text-primary",
                          )}
                          onClick={() =>
                            setLineOptionsEdit({
                              lineKey: line.key,
                              variant: "instructions",
                            })
                          }
                          aria-label={`Special instructions for ${line.productName}`}
                        >
                          <ChefHatIcon className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Remove line"
                        className="size-8 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {line.priceLabel} · {unit} ea · {line.currency}
                  </p>
                  {line.addons.length > 0 ? (
                    <ul className="mt-1 list-none space-y-0 border-l border-primary/30 pl-1.5 text-xs text-muted-foreground">
                      {line.addons.map((a) => {
                        const au = formatMinorToDecimal2(parseMinorFromSerialized(a.unitPriceMinor))
                        return (
                          <li key={a.key} className="tabular-nums leading-tight">
                            + {a.name}
                            {a.quantity !== 1 ? ` ×${a.quantity}` : ""} · {au} {a.currency}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {line.instructions.length > 0 ? (
                    <ul className="mt-1 list-none space-y-0 border-l border-muted-foreground/25 pl-1.5 text-[11px] leading-tight text-muted-foreground">
                      {line.instructions.map((ins) => (
                        <li key={ins.key}>Kitchen: {ins.label}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/50 pt-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                    >
                      <MinusIcon className="size-4" />
                    </Button>
                    <span className="min-w-8 text-center text-sm font-bold tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                    >
                      <PlusIcon className="size-4" />
                    </Button>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{formatMinorToDecimal2(sub)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-auto shrink-0 space-y-2.5 border-t border-border/80 pt-2.5">
        <div className="flex items-center justify-between text-base font-bold">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground tabular-nums">{formatMinorToDecimal2(grandMinor)}</span>
        </div>
        {estimatedPrepLabel && lines.length > 0 ? (
          <p className="text-muted-foreground text-xs leading-snug">
            Est. prep {estimatedPrepLabel}
            <span className="sr-only"> based on catalog prep times and quantities</span> (catalog)
          </p>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor={callNameFieldId} className="text-xs font-medium text-muted-foreground">
            Name for order (optional)
          </Label>
          <Input
            id={callNameFieldId}
            value={customerCallName}
            onChange={(e) => setCustomerCallName(e.target.value)}
            placeholder="e.g. for the counter call-out"
            maxLength={120}
            autoComplete="name"
            className="min-h-11 rounded-xl text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={payFieldId} className="sr-only">
            Payment method
          </Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              if (v && v in PAYMENT_METHOD_LABEL) {
                setPaymentMethod(v as (typeof transactionPaymentMethodValues)[number])
              }
            }}
          >
            <SelectTrigger id={payFieldId} className="min-h-12 w-full rounded-2xl text-base">
              <SelectValue placeholder="Payment method">
                {(val: string | null) =>
                  val && val in PAYMENT_METHOD_LABEL
                    ? PAYMENT_METHOD_LABEL[val as keyof typeof PAYMENT_METHOD_LABEL]
                    : "Payment method"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{PAYMENT_METHOD_LABEL.cash}</SelectItem>
              <SelectItem value="card_placeholder">{PAYMENT_METHOD_LABEL.card_placeholder}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="lg"
          className="min-h-12 w-full rounded-2xl text-base font-semibold"
          disabled={submitting || lines.length === 0}
          onClick={onCheckout}
        >
          {submitting ? "Processing…" : "Complete sale"}
        </Button>
      </div>
    </>
  )
}

export function PosTerminal({
  businessSlug,
  locationSlug,
  products,
  categories,
  addonsByCategory,
  instructionsByCategory,
  initialLastOrderTransactionId,
}: {
  businessSlug: string
  locationSlug: string
  products: PosProductCard[]
  categories: ProductCategoryRow[]
  addonsByCategory: Record<string, PosCategoryAddon[]>
  instructionsByCategory: Record<string, PosCategoryInstruction[]>
  /** Latest DB sale at this branch; updated in-session after each checkout. */
  initialLastOrderTransactionId: string | null
}) {
  const lines = usePosCartStore((s) => s.lines)
  const cartAnnounce = usePosCartStore((s) => s.cartAnnounce)
  const addProduct = usePosCartStore((s) => s.addProduct)
  const setLineAddons = usePosCartStore((s) => s.setLineAddons)
  const setLineInstructions = usePosCartStore((s) => s.setLineInstructions)
  const removeLine = usePosCartStore((s) => s.removeLine)
  const setQuantity = usePosCartStore((s) => s.setQuantity)
  const reset = usePosCartStore((s) => s.reset)
  const clearAnnounce = usePosCartStore((s) => s.clearAnnounce)

  const [search, setSearch] = React.useState("")
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "")
  const [paymentMethod, setPaymentMethod] =
    React.useState<(typeof transactionPaymentMethodValues)[number]>("cash")
  const [submitting, setSubmitting] = React.useState(false)
  const [customerCallName, setCustomerCallName] = React.useState("")
  const [completedSale, setCompletedSale] = React.useState<{
    transactionId: string
    queueNumber: number | null
    customerCallName: string | null
    estimatedPrepSeconds: number | null
  } | null>(null)
  const [pickerProduct, setPickerProduct] =
    React.useState<PosProductCard | null>(null)
  const [lineOptionsEdit, setLineOptionsEdit] = React.useState<null | {
    lineKey: string
    variant: "addons" | "instructions"
  }>(null)
  const [cartOpen, setCartOpen] = React.useState(false)
  const [receiptSheetTxId, setReceiptSheetTxId] = React.useState<string | null>(null)
  const [receiptModel, setReceiptModel] = React.useState<PosReceiptPreviewModel | null>(null)
  const [receiptLoading, setReceiptLoading] = React.useState(false)
  const [lastOrderTransactionId, setLastOrderTransactionId] = React.useState<string | null>(
    () => initialLastOrderTransactionId,
  )

  React.useEffect(() => {
    setLastOrderTransactionId(initialLastOrderTransactionId)
  }, [initialLastOrderTransactionId])

  const cartItemCount = React.useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  )

  React.useEffect(() => {
    if (!cartAnnounce) return
    const t = window.setTimeout(() => clearAnnounce(), 2800)
    return () => window.clearTimeout(t)
  }, [cartAnnounce, clearAnnounce])

  React.useEffect(() => {
    if (categories.length === 0) {
      setCategoryId("")
      return
    }
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0]!.id)
    }
  }, [categories, categoryId])

  React.useEffect(() => {
    if (!cartOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCartOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [cartOpen])

  React.useEffect(() => {
    if (!lineOptionsEdit) return
    if (!lines.some((l) => l.key === lineOptionsEdit.lineKey)) {
      setLineOptionsEdit(null)
    }
  }, [lines, lineOptionsEdit])

  React.useEffect(() => {
    if (!receiptSheetTxId) {
      setReceiptModel(null)
      setReceiptLoading(false)
      return
    }
    let cancelled = false
    setReceiptLoading(true)
    setReceiptModel(null)
    void loadPosReceiptPreview(businessSlug, receiptSheetTxId).then((m) => {
      if (cancelled) return
      setReceiptLoading(false)
      if (m) {
        setReceiptModel(m)
      } else {
        toast.error("Could not load receipt.")
        setReceiptSheetTxId(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [receiptSheetTxId, businessSlug])

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (categories.length > 0 && p.categoryId !== categoryId) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku?.toLowerCase().includes(q) ?? false) ||
        (p.qrCode?.toLowerCase().includes(q) ?? false) ||
        p.categoryName.toLowerCase().includes(q)
      )
    })
  }, [products, search, categoryId, categories.length])

  const grandMinor = React.useMemo(
    () => sumMinor(lines.map((l) => lineSubtotalMinor(l))),
    [lines]
  )

  const estimatedPrepLabel = React.useMemo(() => {
    if (lines.length === 0) return null
    let total = 0
    let any = false
    for (const line of lines) {
      const p = products.find((x) => x.id === line.productId)
      const s = p?.prepTimeSeconds
      if (s != null && s > 0) {
        any = true
        total += s * line.quantity
      }
    }
    return any ? formatCartPrepEstimate(total) : null
  }, [lines, products])

  const lineOptionsLine = React.useMemo(
    () => (lineOptionsEdit ? lines.find((l) => l.key === lineOptionsEdit.lineKey) : null),
    [lines, lineOptionsEdit],
  )

  const lineOptionsProduct = React.useMemo(
    () =>
      lineOptionsLine ? (products.find((p) => p.id === lineOptionsLine.productId) ?? null) : null,
    [products, lineOptionsLine],
  )

  const editAddonsList = React.useMemo(() => {
    if (!lineOptionsProduct || !lineOptionsLine) return []
    const raw = addonsByCategory[lineOptionsProduct.categoryId] ?? []
    return raw.filter((a) => a.currency === lineOptionsLine.currency)
  }, [lineOptionsProduct, lineOptionsLine, addonsByCategory])

  const editInstructionsList = React.useMemo(() => {
    if (!lineOptionsProduct) return []
    return instructionsByCategory[lineOptionsProduct.categoryId] ?? []
  }, [lineOptionsProduct, instructionsByCategory])

  const lineOptionsPrefillKey =
    lineOptionsLine && lineOptionsEdit
      ? `${lineOptionsEdit.lineKey}-${lineOptionsEdit.variant}-${posCartAddonSignature(lineOptionsLine.addons)}-${posCartInstructionSignature(lineOptionsLine.instructions)}`
      : ""

  async function onCheckout() {
    if (lines.length === 0) {
      toast.error("Add at least one item to the cart.")
      return
    }
    const checkoutId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`
    setSubmitting(true)
    try {
      const callNameTrim = customerCallName.trim()
      const res = await createSale({
        businessSlug,
        locationSlug,
        paymentMethod,
        notes: null,
        customerCallName: callNameTrim.length > 0 ? callNameTrim : null,
        checkoutId,
        lines: lines.map((l) => ({
          productId: l.productId,
          productPriceId: l.productPriceId,
          quantity: l.quantity,
          addons: l.addons.map((a) => ({
            addonId: a.addonId,
            quantity: a.quantity,
          })),
          instructions: l.instructions.map((i) => ({
            instructionId: i.instructionId,
          })),
        })),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setLastOrderTransactionId(res.transactionId)
      setCompletedSale({
        transactionId: res.transactionId,
        queueNumber: res.queueNumber,
        customerCallName: res.customerCallName,
        estimatedPrepSeconds: res.estimatedPrepSeconds,
      })
      setCustomerCallName("")
      reset()
    } catch {
      toast.error("Network error. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function onNewSale() {
    setCompletedSale(null)
    setReceiptSheetTxId(null)
    setReceiptModel(null)
    reset()
  }

  function openReceiptSheet() {
    if (!completedSale) return
    setReceiptSheetTxId(completedSale.transactionId)
    setCompletedSale(null)
  }

  function openLastOrderReceipt() {
    if (!lastOrderTransactionId) return
    setReceiptSheetTxId(lastOrderTransactionId)
  }

  const isLgViewport = useViewportMinLg()
  const cartPanelControlsId = isLgViewport ? "pos-cart-sidebar" : "pos-cart-sheet"

  const cartPanelProps: PosCartPanelInnerProps = {
    lines,
    products,
    addonsByCategory,
    instructionsByCategory,
    cartAnnounce,
    grandMinor,
    estimatedPrepLabel,
    customerCallName,
    setCustomerCallName,
    paymentMethod,
    setPaymentMethod,
    submitting,
    onCheckout,
    onCloseCart: () => setCartOpen(false),
    lastOrderTransactionId,
    onOpenLastReceipt: openLastOrderReceipt,
    removeLine,
    setQuantity,
    setLineOptionsEdit,
  }

  const cartTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-expanded={cartOpen}
      aria-controls={cartPanelControlsId}
      aria-label={cartOpen ? "Close cart" : "Open cart"}
      onClick={() => setCartOpen((o) => !o)}
      className="relative size-14 shrink-0 overflow-visible rounded-2xl lg:size-13 [&_svg:not([class*='size-'])]:size-7 lg:[&_svg:not([class*='size-'])]:size-6"
    >
      <ShoppingCartIcon data-icon="inline-start" />
      {cartItemCount > 0 ? (
        <span className="absolute top-0 right-0 z-10 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums shadow-sm ring-2 ring-background">
          {cartItemCount > 99 ? "99+" : cartItemCount}
        </span>
      ) : null}
    </Button>
  )

  return (
    <>
    <div className="relative flex min-h-0 flex-1 touch-manipulation flex-col overflow-hidden">
      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3"
          aria-label="Product catalog"
        >
          <div className="shrink-0 space-y-2 sm:space-y-3">
            <div className="flex min-w-0 items-center gap-2 overflow-visible sm:gap-3">
              <h1 className="hidden min-w-0 shrink-0 truncate text-xl font-bold tracking-tight lg:block sm:text-2xl">
                Register
              </h1>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-visible">
                <Label htmlFor="pos-search" className="sr-only">
                  Search products
                </Label>
                <Input
                  id="pos-search"
                  placeholder="Search name, SKU, or code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 min-h-14 w-full min-w-40 max-w-xl rounded-2xl text-base lg:h-13 lg:min-h-13 sm:min-w-56 sm:max-w-2xl"
                  autoComplete="off"
                  inputMode="search"
                  enterKeyHint="search"
                />
                <LastReceiptBadge
                  transactionId={lastOrderTransactionId}
                  onOpen={openLastOrderReceipt}
                  compact
                />
                {cartTrigger}
              </div>
            </div>
            {categories.length > 0 ? (
              <div
                className={cn(
                  "min-w-0 overflow-x-auto overscroll-x-contain",
                  "touch-pan-x snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
                )}
              >
                <ButtonGroup
                  orientation="horizontal"
                  aria-label="Filter by category"
                  className="w-max items-stretch"
                >
                  {categories.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={categoryId === c.id ? "default" : "outline"}
                      aria-pressed={categoryId === c.id}
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        "h-auto min-h-14 shrink-0 snap-start px-6 py-4 text-lg leading-snug font-semibold",
                        "whitespace-normal active:scale-[0.98] sm:min-h-16 sm:px-8 sm:py-4 sm:text-lg",
                        "max-w-52 sm:max-w-60 lg:min-h-12 lg:max-w-52 lg:px-6 lg:py-3 lg:text-base lg:font-semibold"
                      )}
                      title={c.name}
                    >
                      <span className="line-clamp-2 text-pretty">{c.name}</span>
                    </Button>
                  ))}
                </ButtonGroup>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch] sm:gap-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 @md/main:grid-cols-3 @xl/main:grid-cols-4">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPickerProduct(p)}
                  className={cn(
                    "flex min-h-[168px] flex-col overflow-hidden rounded-2xl border-2 border-border bg-card text-left shadow-sm sm:min-h-[156px] lg:min-h-[148px]",
                    "transition-[transform,box-shadow,border-color] hover:border-primary/40 hover:shadow-md active:scale-[0.98] active:bg-muted/30",
                    "focus-visible:ring-4 focus-visible:ring-ring/30"
                  )}
                >
                  <div className="relative aspect-5/4 min-h-22 w-full bg-muted">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 200px"
                      />
                    ) : (
                      <div className="flex h-full min-h-22 items-center justify-center text-sm text-muted-foreground lg:text-xs">
                        No image
                      </div>
                    )}
                    {p.stockBadge === "out" ? (
                      <Badge
                        variant="destructive"
                        className="absolute top-2 right-2 max-w-[calc(100%-1rem)] truncate px-2 py-0.5 text-[10px] font-bold shadow-md sm:text-xs"
                        title="Out of stock"
                      >
                        Out
                      </Badge>
                    ) : p.stockBadge === "low" ? (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 max-w-[calc(100%-1rem)] truncate border-amber-500/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-md dark:text-amber-100 sm:text-xs"
                        title={
                          p.sellableUnits != null
                            ? `Low stock — about ${p.sellableUnits} left at this branch`
                            : "Low stock"
                        }
                      >
                        {p.sellableUnits != null ? `Low · ~${p.sellableUnits}` : "Low stock"}
                      </Badge>
                    ) : p.stockBadge === "ok" ? (
                      <Badge
                        variant="outline"
                        className="absolute top-2 right-2 max-w-[calc(100%-1rem)] truncate border-emerald-600/35 bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 shadow-sm backdrop-blur-sm dark:border-emerald-500/40 dark:text-emerald-100 sm:text-xs"
                        title={
                          p.sellableUnits != null
                            ? `On stock — about ${p.sellableUnits} sellable from recipe`
                            : "On stock"
                        }
                      >
                        On stock
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex min-h-20 flex-1 flex-col justify-center gap-1.5 p-3.5 pt-2 sm:p-4 lg:min-h-18 lg:p-3">
                    <span className="line-clamp-2 text-lg leading-snug font-semibold sm:text-base lg:text-base">
                      {p.name}
                    </span>
                    <span className="text-sm text-muted-foreground lg:text-xs">
                      {p.categoryName}
                    </span>
                    {p.prices.length > 1 ? (
                      <span className="text-sm font-medium text-primary lg:text-xs">
                        {p.prices.length} prices — tap
                      </span>
                    ) : p.prices.length === 1 ? (
                      <span className="text-sm font-medium text-muted-foreground lg:text-xs">
                        Tap to add
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-destructive lg:text-xs">
                        No price
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 ? (
              <p className="rounded-2xl border border-dashed py-10 text-center text-base text-muted-foreground sm:py-12 lg:text-sm">
                No products in this category for this branch.
              </p>
            ) : null}

            <PosPricePickerDialog
              product={pickerProduct}
              open={pickerProduct !== null}
              onOpenChange={(next) => {
                if (!next) setPickerProduct(null)
              }}
              onPickPrice={(p, priceId, quantity) => {
                setPickerProduct(null)
                addProduct(p, priceId, quantity, [], [])
                setCartOpen(true)
              }}
            />
            <PosAddonsDialog
              variant={lineOptionsEdit?.variant ?? "addons"}
              product={lineOptionsProduct}
              productPriceId={lineOptionsLine?.productPriceId ?? null}
              quantity={lineOptionsLine?.quantity ?? 1}
              addons={lineOptionsEdit?.variant === "instructions" ? [] : editAddonsList}
              instructions={lineOptionsEdit?.variant === "addons" ? [] : editInstructionsList}
              prefillKey={lineOptionsPrefillKey}
              initialAddonIds={lineOptionsLine?.addons.map((a) => a.addonId) ?? []}
              initialInstructionIds={lineOptionsLine?.instructions.map((i) => i.instructionId) ?? []}
              open={lineOptionsEdit !== null}
              onOpenChange={(next) => {
                if (!next) setLineOptionsEdit(null)
              }}
              onConfirm={(payload) => {
                if (!lineOptionsEdit || !lineOptionsLine) return
                if (payload.variant === "addons") {
                  setLineAddons(lineOptionsEdit.lineKey, payload.selections)
                } else {
                  setLineInstructions(lineOptionsEdit.lineKey, payload.instructionSelections)
                }
              }}
            />
          </div>
        </div>

        {!isLgViewport ? (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent
              id="pos-cart-sheet"
              side="right"
              showCloseButton={false}
              aria-label="Shopping cart"
              className={cn(
                "flex min-h-0 flex-col gap-2 border-border/80 bg-background text-popover-foreground shadow-xl",
                /* Flush to viewport right; override Sheet defaults (w-3/4, translate nudge, radius). */
                "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
                "w-[min(100dvw,420px)]! sm:w-[min(100dvw,420px)]! sm:max-w-[420px]!",
                "gap-0 rounded-none border-l p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
              )}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Shopping cart</SheetTitle>
                <SheetDescription>Review items and complete the sale.</SheetDescription>
              </SheetHeader>
              <PosCartPanelInner {...cartPanelProps} />
            </SheetContent>
          </Sheet>
        ) : null}

        <aside
          id="pos-cart-sidebar"
          aria-label="Shopping cart"
          aria-hidden={!cartOpen}
          className={cn(
            "hidden min-h-0 flex-col gap-2 border-border/80 bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl lg:flex",
            "lg:relative lg:z-0 lg:bg-muted/15 lg:shadow-none lg:transition-[width,opacity,margin] lg:duration-200 lg:ease-out",
            cartOpen
              ? "lg:ml-3 lg:w-[min(100%,320px)] lg:min-w-[280px] lg:border-l lg:opacity-100"
              : "lg:pointer-events-none lg:m-0 lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-0 lg:p-0 lg:opacity-0",
          )}
        >
          {isLgViewport ? <PosCartPanelInner {...cartPanelProps} /> : null}
        </aside>
      </div>
    </div>

    <Dialog
      open={completedSale !== null}
      onOpenChange={(open) => {
        if (!open) setCompletedSale(null)
      }}
    >
      <DialogContent className="max-w-md text-center" showCloseButton>
        <DialogHeader className="items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-5 text-primary">
            <StoreIcon className="size-10" />
          </div>
          <DialogTitle className="text-xl font-semibold">Sale complete</DialogTitle>
          <DialogDescription className="sr-only">
            Transaction saved. You can print the receipt or start another sale.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-center text-base text-foreground">
          {completedSale?.queueNumber != null ? (
            <p className="text-2xl font-bold tabular-nums">Order #{completedSale.queueNumber}</p>
          ) : null}
          {completedSale?.customerCallName ? (
            <p className="text-muted-foreground">For {completedSale.customerCallName}</p>
          ) : null}
          {completedSale?.estimatedPrepSeconds != null && completedSale.estimatedPrepSeconds > 0 ? (
            <p className="text-muted-foreground text-sm">
              Est. prep {formatCartPrepEstimate(completedSale.estimatedPrepSeconds)} (typical, from
              catalog)
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm">
            You can print the receipt or start another sale.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            size="lg"
            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
            onClick={openReceiptSheet}
          >
            Print receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
            onClick={onNewSale}
          >
            New sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Sheet
      open={receiptSheetTxId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReceiptSheetTxId(null)
          setReceiptModel(null)
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label="Receipt preview"
        className={cn(
          "flex min-h-0 flex-col gap-0 border-border/80 bg-background text-popover-foreground shadow-xl",
          "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
          "w-[min(100dvw,420px)]! sm:w-[min(100dvw,420px)]! sm:max-w-[420px]!",
          "overflow-hidden rounded-none border-l p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Receipt</SheetTitle>
          <SheetDescription>Preview and print the transaction receipt.</SheetDescription>
        </SheetHeader>
        <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
          <h2 className="text-base font-semibold tracking-tight">Receipt</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto size-11 shrink-0 rounded-xl"
            aria-label="Close receipt"
            onClick={() => {
              setReceiptSheetTxId(null)
              setReceiptModel(null)
            }}
          >
            <XIcon />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
          {receiptLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading receipt…</p>
          ) : receiptModel ? (
            <PosReceiptDocument
              model={receiptModel}
              className="max-w-none py-0"
              footerSlot={
                <>
                  <PrintReceiptButton />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-4xl px-3"
                    onClick={() => {
                      setReceiptSheetTxId(null)
                      setReceiptModel(null)
                    }}
                  >
                    Done
                  </Button>
                </>
              }
              belowSlot={
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  For best results, enable background graphics in the print dialog if you want logo colors.
                </p>
              }
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
