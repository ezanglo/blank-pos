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
