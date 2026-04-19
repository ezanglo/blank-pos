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
  const tail = pathname.split("/reports/")[1]?.split("/")[0] ?? ""
  const active =
    tail === "products" ? "products" : tail === "transactions" ? "transactions" : "daily"

  return <ReportsSubNav businessSlug={businessSlug} locationSlug={locationSlug} active={active} />
}
