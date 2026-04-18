"use client"

import { create } from "zustand"

import { pickDefaultProductPriceId, type PosProductCard } from "@/lib/pos/pos-types"

export type PosCartLine = {
  key: string
  productId: string
  productName: string
  productPriceId: string
  priceLabel: string
  unitPriceMinor: string
  currency: string
  quantity: number
}

function newLineKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `line-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function lineFromTier(
  p: PosProductCard,
  productPriceId: string,
  key: string,
  quantity: number,
): PosCartLine | null {
  const pr = p.prices.find((x) => x.id === productPriceId)
  if (!pr) return null
  const q = Math.max(1, Math.min(9999, Math.floor(quantity)))
  return {
    key,
    productId: p.id,
    productName: p.name,
    productPriceId: pr.id,
    priceLabel: pr.label,
    unitPriceMinor: pr.amountMinor,
    currency: pr.currency,
    quantity: q,
  }
}

type PosCartState = {
  lines: PosCartLine[]
  cartAnnounce: string
  /**
   * `productPriceId` optional: when set, adds that tier; otherwise uses default tier.
   * `quantity` optional: units to add (default 1). Merging an existing line adds this many.
   */
  addProduct: (p: PosProductCard, productPriceId?: string, quantity?: number) => void
  removeLine: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  reset: () => void
  clearAnnounce: () => void
}

export const usePosCartStore = create<PosCartState>((set) => ({
  lines: [],
  cartAnnounce: "",
  addProduct: (p, productPriceId, quantity = 1) => {
    const tier = productPriceId ?? pickDefaultProductPriceId(p.prices)
    if (!tier) {
      set({ cartAnnounce: `${p.name} has no price.` })
      return
    }
    const addQty = Math.max(1, Math.min(9999, Math.floor(quantity)))
    const key = newLineKey()
    set((state) => {
      const hit = state.lines.find((l) => l.productId === p.id && l.productPriceId === tier)
      if (hit) {
        const lines = state.lines.map((l) =>
          l.key === hit.key
            ? { ...l, quantity: Math.min(9999, l.quantity + addQty) }
            : l,
        )
        const nextQty = lines.find((x) => x.key === hit.key)!.quantity
        return { lines, cartAnnounce: `${p.name}, quantity ${nextQty}` }
      }
      const line = lineFromTier(p, tier, key, addQty)
      if (!line) return state
      return {
        lines: [...state.lines, line],
        cartAnnounce: addQty > 1 ? `${p.name} ×${addQty} added` : `${p.name} added to cart`,
      }
    })
  },
  removeLine: (key) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.key !== key),
    })),
  setQuantity: (key, quantity) => {
    const q = Math.max(1, Math.min(9999, Math.floor(quantity)))
    set((state) => ({
      lines: state.lines.map((l) => (l.key === key ? { ...l, quantity: q } : l)),
    }))
  },
  reset: () => set({ lines: [], cartAnnounce: "" }),
  clearAnnounce: () => set({ cartAnnounce: "" }),
}))
