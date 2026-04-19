"use client"

import { usePathname } from "next/navigation"

import { ReportsSubNav } from "@/components/reports-sub-nav"

export function ReportsSubNavClient({
  businessSlug,
  locationSlug,
}: {
  businessSlug: string
  locationSlug: string
}) {
  const pathname = usePathname()
  const active = pathname.includes("/reports/products")
    ? "products"
    : pathname.includes("/reports/transactions")
      ? "transactions"
      : "daily"

  return <ReportsSubNav businessSlug={businessSlug} locationSlug={locationSlug} active={active} />
}
