import assert from "node:assert/strict"
import { describe, it } from "node:test"

/** Mirrors merge logic in sale-deduction.ts — duplicate recipe lines same (line, item) collapse to one movement. */
function mergeDeductions(
  deductions: { transactionItemId: string; inventoryItemId: string; qty: number }[],
) {
  const mergedByLineAndItem = new Map<
    string,
    { transactionItemId: string; inventoryItemId: string; qty: number }
  >()
  for (const d of deductions) {
    const k = `${d.transactionItemId}:${d.inventoryItemId}`
    const prev = mergedByLineAndItem.get(k)
    if (prev) prev.qty += d.qty
    else mergedByLineAndItem.set(k, { ...d })
  }
  return [...mergedByLineAndItem.values()]
}

describe("mergeSaleDeductions", () => {
  it("merges duplicate line+ingredient rows", () => {
    const out = mergeDeductions([
      { transactionItemId: "t1", inventoryItemId: "i1", qty: 2 },
      { transactionItemId: "t1", inventoryItemId: "i1", qty: 3 },
    ])
    assert.deepEqual(out, [{ transactionItemId: "t1", inventoryItemId: "i1", qty: 5 }])
  })

  it("keeps separate transaction items distinct", () => {
    const out = mergeDeductions([
      { transactionItemId: "t1", inventoryItemId: "i1", qty: 1 },
      { transactionItemId: "t2", inventoryItemId: "i1", qty: 2 },
    ])
    assert.equal(out.length, 2)
  })
})
