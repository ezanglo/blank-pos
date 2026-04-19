import { NextResponse } from "next/server"

import { getOrgForUser } from "@/lib/queries/organization"
import {
  getProductSalesForRange,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  parseTransactionStatusFilter,
  productSalesRowsToCsv,
} from "@/lib/queries/reports"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"
import { getServerSession } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ businessSlug: string; locationSlug: string }> },
) {
  const { businessSlug, locationSlug } = await context.params
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const location = await getLocationByOrganizationAndSlug(ctx.organization.id, locationSlug)
  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const fromStr = searchParams.get("from") ?? ""
  const toStr = searchParams.get("to") ?? ""
  const from = parseReportDayStartUtc(fromStr)
  const to = parseReportDayEndUtc(toStr)
  if (!from || !to) {
    return NextResponse.json({ error: "Invalid from/to dates (YYYY-MM-DD)." }, { status: 400 })
  }

  const status = parseTransactionStatusFilter(searchParams.get("status") ?? undefined)
  const rows = await getProductSalesForRange(ctx.organization.id, location.id, from, to, status)
  const csv = productSalesRowsToCsv(rows)
  const filename = `product-sales-${fromStr}-to-${toStr}.csv`

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
