"use client"

import { create } from "zustand"

import { posCartAddonSignature, posCartInstructionSignature } from "@/lib/pos/pos-addon-signature"
import { generateClientUuid } from "@/lib/utils"
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
  instructions: PosCartInstructionLine[]
}

export type PosCartAddonSelection = {
  addonId: string
  name: string
  unitPriceMinor: string
  currency: string
  quantity: number
}

export type PosCartInstructionLine = {
  key: string
  instructionId: string
  label: string
}

export type PosCartInstructionSelection = {
  instructionId: string
  label: string
}

function newLineKey(): string {
  return generateClientUuid()
}

function addonSelectionsToLines(selections: PosCartAddonSelection[]): PosCartAddonLine[] {
  return selections.map((s) => ({
    key: newLineKey(),
    addonId: s.addonId,
    name: s.name,
    unitPriceMinor: s.unitPriceMinor,
    currency: s.currency,
    quantity: Math.max(1, Math.min(99, Math.floor(s.quantity))),
  }))
}

function instructionSelectionsToLines(selections: PosCartInstructionSelection[]): PosCartInstructionLine[] {
  return selections.map((s) => ({
    key: newLineKey(),
    instructionId: s.instructionId,
    label: s.label,
  }))
}

function lineFromTier(
  p: PosProductCard,
  productPriceId: string,
  key: string,
  quantity: number,
  addonSelections: PosCartAddonSelection[],
  instructionSelections: PosCartInstructionSelection[],
): PosCartLine | null {
  const pr = p.prices.find((x) => x.id === productPriceId)
  if (!pr) return null
  const q = Math.max(1, Math.min(9999, Math.floor(quantity)))
  const addons = addonSelectionsToLines(addonSelections)
  const instructions = instructionSelectionsToLines(instructionSelections)
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
    instructions,
  }
}

/** Build one cart line (e.g. reorder); returns null if the price tier is missing on the product card. */
export function createPosCartLine(
  p: PosProductCard,
  productPriceId: string,
  quantity: number,
  addonSelections: PosCartAddonSelection[],
  instructionSelections: PosCartInstructionSelection[],
): PosCartLine | null {
  const key = newLineKey()
  return lineFromTier(p, productPriceId, key, quantity, addonSelections, instructionSelections)
}

/** After editing options, merge into an identical sibling line or keep a single updated row. */
function mergeOrReplaceLine(lines: PosCartLine[], updatedKey: string, updated: PosCartLine): PosCartLine[] {
  const rest = lines.filter((l) => l.key !== updatedKey)
  const twin = rest.find(
    (l) =>
      l.productId === updated.productId &&
      l.productPriceId === updated.productPriceId &&
      posCartAddonSignature(l.addons) === posCartAddonSignature(updated.addons) &&
      posCartInstructionSignature(l.instructions) === posCartInstructionSignature(updated.instructions),
  )
  if (twin) {
    return rest.map((l) =>
      l.key === twin.key ? { ...l, quantity: Math.min(9999, l.quantity + updated.quantity) } : l,
    )
  }
  return [...rest, updated]
}

type PosCartState = {
  lines: PosCartLine[]
  cartAnnounce: string
  /**
   * Merges with an existing line only when product, price tier, add-on signature, and instruction
   * signature match.
   * `productPriceId` optional: when set, adds that tier; otherwise uses default tier.
   * `quantity` optional: units to add (default 1). Merging adds this many to the matched line.
   */
  addProduct: (
    p: PosProductCard,
    productPriceId?: string,
    quantity?: number,
    addonSelections?: PosCartAddonSelection[],
    instructionSelections?: PosCartInstructionSelection[],
  ) => void
  setLineAddons: (lineKey: string, addonSelections: PosCartAddonSelection[]) => void
  setLineInstructions: (lineKey: string, instructionSelections: PosCartInstructionSelection[]) => void
  removeLine: (key: string) => void
  setQuantity: (key: string, quantity: number) => void
  reset: () => void
  /** Replace all lines in one step (e.g. reorder). */
  replaceEntireCart: (lines: PosCartLine[], announce?: string) => void
  clearAnnounce: () => void
}

export const usePosCartStore = create<PosCartState>((set) => ({
  lines: [],
  cartAnnounce: "",
  addProduct: (p, productPriceId, quantity = 1, addonSelections = [], instructionSelections = []) => {
    const tier = productPriceId ?? pickDefaultProductPriceId(p.prices)
    if (!tier) {
      set({ cartAnnounce: `${p.name} has no price.` })
      return
    }
    const addQty = Math.max(1, Math.min(9999, Math.floor(quantity)))
    const incomingAddonSig = posCartAddonSignature(addonSelections)
    const incomingInstrSig = posCartInstructionSignature(instructionSelections)
    const key = newLineKey()
    set((state) => {
      const hit = state.lines.find(
        (l) =>
          l.productId === p.id &&
          l.productPriceId === tier &&
          posCartAddonSignature(l.addons) === incomingAddonSig &&
          posCartInstructionSignature(l.instructions) === incomingInstrSig,
      )
      if (hit) {
        const lines = state.lines.map((l) =>
          l.key === hit.key ? { ...l, quantity: Math.min(9999, l.quantity + addQty) } : l,
        )
        const nextQty = lines.find((x) => x.key === hit.key)!.quantity
        return { lines, cartAnnounce: `${p.name}, quantity ${nextQty}` }
      }
      const line = lineFromTier(p, tier, key, addQty, addonSelections, instructionSelections)
      if (!line) return state
      return {
        lines: [...state.lines, line],
        cartAnnounce: addQty > 1 ? `${p.name} ×${addQty} added` : `${p.name} added to cart`,
      }
    })
  },
  setLineAddons: (lineKey, addonSelections) => {
    set((state) => {
      const line = state.lines.find((l) => l.key === lineKey)
      if (!line) return state
      const addons = addonSelectionsToLines(addonSelections)
      const updated = { ...line, addons }
      return {
        lines: mergeOrReplaceLine(state.lines, lineKey, updated),
        cartAnnounce: "Add-ons updated",
      }
    })
  },
  setLineInstructions: (lineKey, instructionSelections) => {
    set((state) => {
      const line = state.lines.find((l) => l.key === lineKey)
      if (!line) return state
      const instructions = instructionSelectionsToLines(instructionSelections)
      const updated = { ...line, instructions }
      return {
        lines: mergeOrReplaceLine(state.lines, lineKey, updated),
        cartAnnounce: "Instructions updated",
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
  replaceEntireCart: (lines, announce = "") => set({ lines, cartAnnounce: announce }),
  clearAnnounce: () => set({ cartAnnounce: "" }),
}))
