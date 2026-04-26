export type TransactionOrderSearchFilter =
  | { mode: "queue"; queueNumber: number }
  | { mode: "exact"; dayStart: Date; dayEnd: Date; queueNumber: number }

/**
 * Parse user input for transaction list search.
 * - Full label: `OR-YYYYMMDD-N` or `YYYYMMDD-N` (UTC date + daily queue number).
 * - Queue only: digits only, e.g. `12` — matches that queue number within the selected date range.
 */
export function parseTransactionOrderSearch(raw: string): TransactionOrderSearchFilter | null {
  const t = raw.trim()
  if (!t) return null

  const exact = /^(?:OR-)?(\d{4})(\d{2})(\d{2})-(\d+)$/i.exec(t)
  if (exact) {
    const [, y, mo, d, q] = exact
    const iso = `${y}-${mo}-${d}`
    const dayStart = new Date(`${iso}T00:00:00.000Z`)
    const dayEnd = new Date(`${iso}T23:59:59.999Z`)
    const queueNumber = Number.parseInt(q, 10)
    if (!Number.isFinite(queueNumber)) return null
    return { mode: "exact", dayStart, dayEnd, queueNumber }
  }

  if (/^\d+$/.test(t)) {
    const queueNumber = Number.parseInt(t, 10)
    if (!Number.isFinite(queueNumber)) return null
    return { mode: "queue", queueNumber }
  }

  return null
}

/**
 * Display label for café-style daily order numbers.
 * Uses UTC calendar date so it matches `location_queue_counter.queue_date` (YYYY-MM-DD UTC).
 */
export function formatOrderNumberLabel(
  createdAt: Date,
  queueNumber: number | null | undefined,
): string {
  if (queueNumber == null) return "—"
  const y = createdAt.getUTCFullYear()
  const m = String(createdAt.getUTCMonth() + 1).padStart(2, "0")
  const d = String(createdAt.getUTCDate()).padStart(2, "0")
  return `OR-${y}${m}${d}-${queueNumber}`
}
