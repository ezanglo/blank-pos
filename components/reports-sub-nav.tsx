import Link from "next/link"

import { cn } from "@/lib/utils"

const links = [
  { href: "daily", label: "Daily summary" },
  { href: "products", label: "Product sales" },
  { href: "transactions", label: "Transactions" },
] as const

export function ReportsSubNav({
  businessSlug,
  locationSlug,
  active,
}: {
  businessSlug: string
  locationSlug: string
  active: (typeof links)[number]["href"]
}) {
  const base = `/${businessSlug}/l/${locationSlug}/reports`
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {links.map((l) => (
        <Link
          key={l.href}
          href={`${base}/${l.href}`}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            active === l.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
