import Link from "next/link"

import { BanknoteIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DashboardBranchShell({
  locationName,
  businessSlug,
  locationSlug,
}: {
  locationName: string
  businessSlug: string
  locationSlug: string
}) {
  const posHref = `/${businessSlug}/l/${locationSlug}/pos`

  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{locationName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Branch home · Sales metrics use UTC calendar days (same basis as Reports).
        </p>
      </div>
      <Link
        href={posHref}
        className={cn(buttonVariants({ size: "lg" }), "gap-2 self-start sm:self-auto")}
      >
        <BanknoteIcon className="size-4" aria-hidden />
        Open register
      </Link>
    </div>
  )
}
