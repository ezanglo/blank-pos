"use client"

import { create } from "zustand"

import { posCartAddonSignature } from "@/lib/pos/pos-addon-signature"
import { pickDefaultProductPriceId, type PosProductCard } from "@/lib/pos/pos-types"

export type PosCartAddonLine = {
  key: string
  addonId: string
  name: string
  unitPriceMinor: string
  currency: string
  /** Per parent unit (e.g. pearls per drink). */
  quantity: number
}

export type PosCartLine = {
  key: string
  productId: string
  productName: string
  productPriceId: string
  priceLabel: string
  unitPriceMinor: string
  currency: string
  quantity: number
  addons: PosCartAddonLine[]
}

export type PosCartAddonSelection = {
  addonId: string
  name: string
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
  addonSelections: PosCartAddonSelection[],
): PosCartLine | null {
  const pr = p.prices.find((x) => x.id === productPriceId)
  if (!pr) return null
  const q = Math.max(1, Math.min(9999, Math.floor(quantity)))
  const addons: PosCartAddonLine[] = addonSelections.map((s) => ({
    key: newLineKey(),
    addonId: s.addonId,
    name: s.name,
    unitPriceMinor: s.unitPriceMinor,
    currency: s.currency,
    quantity: Math.max(1, Math.min(99, Math.floor(s.quantity))),
  }))
  return {
    key,
    productId: p.id,
    productName: p.name,
    productPriceId: pr.id,
    priceLabel: pr.label,
    unitPriceMinor: pr.amountMinor,
    currency: pr.currency,
    quantity: q,
    addons,
  }
}

type PosCartState = {
  lines: PosCartLine[]
  cartAnnounce: string
  /**
   * Merges with an existing line only when product, price tier, and add-on signature match.
   * `productPriceId` optional: when set, adds that tier; otherwise uses default tier.
   * `quantity` optional: units to add (default 1). Merging adds this many to the matched line.
   */
  addProduct: (
    p: PosProductCard,
    productPriceId?: string,
    quantity?: number,
    addonSelections?: PosCartAddonSelection[],
  ) => void
  removeLine: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  reset: () => void
  clearAnnounce: () => void
}

export const usePosCartStore = create<PosCartState>((set) => ({
  lines: [],
  cartAnnounce: "",
  addProduct: (p, productPriceId, quantity = 1, addonSelections = []) => {
    const tier = productPriceId ?? pickDefaultProductPriceId(p.prices)
    if (!tier) {
      set({ cartAnnounce: `${p.name} has no price.` })
      return
    }
    const addQty = Math.max(1, Math.min(9999, Math.floor(quantity)))
    const incomingSig = posCartAddonSignature(addonSelections)
    const key = newLineKey()
    set((state) => {
      const hit = state.lines.find(
        (l) =>
          l.productId === p.id &&
          l.productPriceId === tier &&
          posCartAddonSignature(l.addons) === incomingSig,
      )
      if (hit) {
        const lines = state.lines.map((l) =>
          l.key === hit.key ? { ...l, quantity: Math.min(9999, l.quantity + addQty) } : l,
        )
        const nextQty = lines.find((x) => x.key === hit.key)!.quantity
        return { lines, cartAnnounce: `${p.name}, quantity ${nextQty}` }
      }
      const line = lineFromTier(p, tier, key, addQty, addonSelections)
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
