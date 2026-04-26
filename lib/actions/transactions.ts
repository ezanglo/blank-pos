"use server"

import { and, eq } from "drizzle-orm"

import { requireCatalogMember } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { posTransactions } from "@/lib/db/schema-transactions"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"

export type VoidTransactionResult =
  | { ok: true }
  | {
      ok: false
      error: "forbidden" | "location" | "not_found" | "already_voided" | "server"
      message: string
    }

export async function voidTransaction(
  businessSlug: string,
  locationSlug: string,
  transactionId: string,
): Promise<VoidTransactionResult> {
  let ctx: Awaited<ReturnType<typeof requireCatalogMember>>
  try {
    ctx = await requireCatalogMember(businessSlug)
  } catch {
    return { ok: false, error: "forbidden", message: "You do not have access to this business." }
  }

  const location = await getLocationByOrganizationAndSlug(ctx.organization.id, locationSlug)
  if (!location) {
    return { ok: false, error: "location", message: "Branch not found." }
  }

  const db = getDb()
  const [existing] = await db
    .select({ status: posTransactions.status })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.id, transactionId),
        eq(posTransactions.organizationId, ctx.organization.id),
        eq(posTransactions.locationId, location.id),
      ),
    )
    .limit(1)

  if (!existing) {
    return { ok: false, error: "not_found", message: "Transaction not found." }
  }
  if (existing.status === "voided") {
    return { ok: false, error: "already_voided", message: "This transaction is already voided." }
  }

  try {
    await db
      .update(posTransactions)
      .set({ status: "voided" })
      .where(
        and(
          eq(posTransactions.id, transactionId),
          eq(posTransactions.organizationId, ctx.organization.id),
          eq(posTransactions.locationId, location.id),
        ),
      )
  } catch (error) {
    console.error(error)
    return { ok: false, error: "server", message: "Could not void transaction. Please try again." }
  }

  return { ok: true }
}
