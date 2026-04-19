import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import type { BelowReorderRow } from "@/lib/queries/catalog"
import { cn } from "@/lib/utils"

export function DashboardLowStockBanner({
  businessSlug,
  items,
}: {
  businessSlug: string
  items: BelowReorderRow[]
}) {
  if (items.length === 0) return null

  return (
    <div className="border-amber-500/40 bg-amber-500/10 rounded-xl border px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-amber-950 dark:text-amber-100">
            {items.length} ingredient{items.length === 1 ? "" : "s"} at or below reorder point
          </p>
          <ul className="text-muted-foreground mt-1 max-h-24 list-inside list-disc overflow-y-auto text-sm">
            {items.slice(0, 8).map((i) => (
              <li key={i.itemId}>
                {i.name} — {i.quantity} / reorder {i.reorderPoint}
              </li>
            ))}
            {items.length > 8 ? <li>…and {items.length - 8} more</li> : null}
          </ul>
        </div>
        <Link
          href={`/${businessSlug}/catalog/inventory`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 self-start")}
        >
          Open inventory
        </Link>
      </div>
    </div>
  )
}
