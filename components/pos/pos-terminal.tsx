"use client"

import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  StoreIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { PosAddonsDialog } from "@/components/pos/pos-addons-dialog"
import { PosPricePickerDialog } from "@/components/pos/pos-price-picker-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
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
import type { PosProductCard } from "@/lib/pos/pos-types"
import type { PosCategoryAddon } from "@/lib/queries/catalog-addons"
import { usePosCartStore, type PosCartLine } from "@/lib/stores/pos-cart-store"
import { cn } from "@/lib/utils"

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

export function PosTerminal({
  businessSlug,
  locationSlug,
  products,
  categories,
  addonsByCategory,
}: {
  businessSlug: string
  locationSlug: string
  products: PosProductCard[]
  categories: ProductCategoryRow[]
  addonsByCategory: Record<string, PosCategoryAddon[]>
}) {
  const lines = usePosCartStore((s) => s.lines)
  const cartAnnounce = usePosCartStore((s) => s.cartAnnounce)
  const addProduct = usePosCartStore((s) => s.addProduct)
  const removeLine = usePosCartStore((s) => s.removeLine)
  const setQuantity = usePosCartStore((s) => s.setQuantity)
  const reset = usePosCartStore((s) => s.reset)
  const clearAnnounce = usePosCartStore((s) => s.clearAnnounce)

  const [search, setSearch] = React.useState("")
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "")
  const [paymentMethod, setPaymentMethod] =
    React.useState<(typeof transactionPaymentMethodValues)[number]>("cash")
  const [submitting, setSubmitting] = React.useState(false)
  const [doneTransactionId, setDoneTransactionId] = React.useState<
    string | null
  >(null)
  const [pickerProduct, setPickerProduct] =
    React.useState<PosProductCard | null>(null)
  const [addonFlow, setAddonFlow] = React.useState<null | {
    product: PosProductCard
    priceId: string
    quantity: number
  }>(null)
  const [cartOpen, setCartOpen] = React.useState(false)

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

  const receiptHref = `/${businessSlug}/l/${locationSlug}/pos/receipt/${doneTransactionId}`

  const addonDialogList = React.useMemo(() => {
    if (!addonFlow) return []
    const pr = addonFlow.product.prices.find((x) => x.id === addonFlow.priceId)
    const raw = addonsByCategory[addonFlow.product.categoryId] ?? []
    if (!pr) return []
    return raw.filter((a) => a.currency === pr.currency)
  }, [addonFlow, addonsByCategory])

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
      const res = await createSale({
        businessSlug,
        locationSlug,
        paymentMethod,
        notes: null,
        checkoutId,
        lines: lines.map((l) => ({
          productId: l.productId,
          productPriceId: l.productPriceId,
          quantity: l.quantity,
          addons: l.addons.map((a) => ({
            addonId: a.addonId,
            quantity: a.quantity,
          })),
        })),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setDoneTransactionId(res.transactionId)
      reset()
    } catch {
      toast.error("Network error. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function onNewSale() {
    setDoneTransactionId(null)
    reset()
  }

  const cartTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-expanded={cartOpen}
      aria-controls="pos-cart-sidebar"
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

  if (doneTransactionId) {
    return (
      <div className="mx-auto flex w-full max-w-lg touch-manipulation flex-col gap-6 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-5 text-primary sm:p-4">
            <StoreIcon className="size-12 sm:size-10" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-xl sm:font-semibold">
            Sale complete
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-sm">
            Transaction saved. You can print the receipt or start another sale.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={receiptHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "inline-flex min-h-12 justify-center py-3 text-base sm:min-h-10 sm:py-2 sm:text-sm"
            )}
          >
            Print receipt
          </Link>
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
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 touch-manipulation flex-col overflow-hidden">
      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3"
          aria-label="Product catalog"
        >
          <div className="shrink-0 space-y-2 sm:space-y-3">
            <div className="flex min-w-0 items-center gap-2 overflow-visible sm:gap-3">
              <h1 className="min-w-0 shrink-0 truncate text-xl font-bold tracking-tight sm:text-2xl">
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
                const pr = p.prices.find((x) => x.id === priceId)
                const raw = addonsByCategory[p.categoryId] ?? []
                const list = pr ? raw.filter((a) => a.currency === pr.currency) : []
                if (list.length > 0) {
                  setAddonFlow({ product: p, priceId, quantity })
                } else {
                  addProduct(p, priceId, quantity, [])
                  setCartOpen(true)
                }
              }}
            />
            <PosAddonsDialog
              product={addonFlow?.product ?? null}
              productPriceId={addonFlow?.priceId ?? null}
              quantity={addonFlow?.quantity ?? 1}
              addons={addonDialogList}
              open={addonFlow !== null}
              onOpenChange={(next) => {
                if (!next) setAddonFlow(null)
              }}
              onConfirm={(pick) => {
                addProduct(pick.product, pick.productPriceId, pick.quantity, pick.selections)
                setAddonFlow(null)
                setCartOpen(true)
              }}
            />
          </div>
        </div>

        {cartOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/30 lg:hidden"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
        ) : null}

        <aside
          id="pos-cart-sidebar"
          aria-label="Shopping cart"
          aria-hidden={!cartOpen}
          className={cn(
            "flex min-h-0 flex-col gap-2 border-border/80 bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl",
            "max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:w-[min(100%,420px)] max-lg:max-w-[92vw] max-lg:border-l",
            "max-lg:transition-transform max-lg:duration-200 max-lg:ease-out",
            cartOpen
              ? "max-lg:right-2 max-lg:translate-x-0"
              : "max-lg:pointer-events-none max-lg:right-0 max-lg:translate-x-full",
            "lg:relative lg:z-0 lg:max-w-none lg:translate-x-0 lg:bg-muted/15 lg:shadow-none lg:transition-[width,opacity,margin] lg:duration-200 lg:ease-out",
            cartOpen
              ? "lg:ml-3 lg:w-[min(100%,320px)] lg:min-w-[280px] lg:border-l lg:opacity-100"
              : "lg:pointer-events-none lg:m-0 lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-0 lg:p-0 lg:opacity-0"
          )}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border/70 pb-2">
            <h2 className="text-base font-semibold tracking-tight">Cart</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-11 shrink-0 rounded-xl"
              aria-label="Close cart"
              onClick={() => setCartOpen(false)}
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
                Tap a product, choose price and quantity. To change price,
                remove the line and add again.
              </p>
            </div>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
              {lines.map((line) => {
                const sub = lineSubtotalMinor(line)
                const unit = formatMinorToDecimal2(
                  parseMinorFromSerialized(line.unitPriceMinor)
                )
                return (
                  <li
                    key={line.key}
                    className="rounded-xl border border-border/80 bg-background/90 px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-base leading-tight font-semibold">
                          {line.productName}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {line.priceLabel} · {unit} ea · {line.currency}
                        </p>
                        {line.addons.length > 0 ? (
                          <ul className="mt-1.5 list-none space-y-0.5 border-l-2 border-primary/25 pl-2 text-sm text-muted-foreground">
                            {line.addons.map((a) => {
                              const au = formatMinorToDecimal2(
                                parseMinorFromSerialized(a.unitPriceMinor),
                              )
                              return (
                                <li key={a.key} className="tabular-nums">
                                  + {a.name}
                                  {a.quantity !== 1 ? ` ×${a.quantity}` : ""} · {au}{" "}
                                  {a.currency}
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-11 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          className="size-11 rounded-xl"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setQuantity(line.key, line.quantity - 1)
                          }
                        >
                          <MinusIcon />
                        </Button>
                        <span className="min-w-10 text-center text-lg font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          className="size-11 rounded-xl"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setQuantity(line.key, line.quantity + 1)
                          }
                        >
                          <PlusIcon />
                        </Button>
                      </div>
                      <span className="text-lg font-bold tabular-nums">
                        {formatMinorToDecimal2(sub)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-auto shrink-0 space-y-2.5 border-t border-border/80 pt-2.5">
            <div className="flex items-center justify-between text-base font-bold">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground tabular-nums">
                {formatMinorToDecimal2(grandMinor)}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-pay" className="sr-only">
                Payment method
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => {
                  if (v && v in PAYMENT_METHOD_LABEL) {
                    setPaymentMethod(
                      v as (typeof transactionPaymentMethodValues)[number]
                    )
                  }
                }}
              >
                <SelectTrigger
                  id="pos-pay"
                  className="min-h-12 w-full rounded-2xl text-base"
                >
                  <SelectValue placeholder="Payment method">
                    {(val: string | null) =>
                      val && val in PAYMENT_METHOD_LABEL
                        ? PAYMENT_METHOD_LABEL[
                            val as keyof typeof PAYMENT_METHOD_LABEL
                          ]
                        : "Payment method"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    {PAYMENT_METHOD_LABEL.cash}
                  </SelectItem>
                  <SelectItem value="card_placeholder">
                    {PAYMENT_METHOD_LABEL.card_placeholder}
                  </SelectItem>
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
        </aside>
      </div>
    </div>
  )
}
