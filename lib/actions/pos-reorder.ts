"use server"

import { serializeMinor } from "@/lib/money"
import type { PosReorderPayloadSerialized } from "@/lib/pos/reorder-payload"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { getTransactionReorderPayload } from "@/lib/queries/transactions"
import { requireSession } from "@/lib/server-auth"

export async function loadPosReorderPayload(
  businessSlug: string,
  locationSlug: string,
  transactionId: string,
): Promise<PosReorderPayloadSerialized | null> {
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return null
  const loc = await getLocationByOrganizationAndSlug(ctx.organization.id, locationSlug)
  if (!loc) return null
  const raw = await getTransactionReorderPayload(ctx.organization.id, loc.id, transactionId)
  if (!raw) return null
  return {
    customerCallName: raw.customerCallName,
    lines: raw.lines.map((l) => ({
      productId: l.productId,
      productPriceId: l.productPriceId,
      productName: l.productName,
      quantity: l.quantity,
      currency: l.currency,
      addons: l.addons.map((a) => ({
        addonId: a.addonId,
        name: a.name,
        unitPriceMinor: serializeMinor(a.unitPriceMinor),
        quantity: a.quantity,
      })),
      instructions: l.instructions,
    })),
  }
}
