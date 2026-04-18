"use server"

import { transactionBundleToPreviewModel, type PosReceiptPreviewModel } from "@/lib/pos/receipt-preview"
import { getOrgForUser } from "@/lib/queries/organization"
import { getTransactionReceiptBundle } from "@/lib/queries/transactions"
import { requireSession } from "@/lib/server-auth"

export async function loadPosReceiptPreview(
  businessSlug: string,
  transactionId: string,
): Promise<PosReceiptPreviewModel | null> {
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return null
  const bundle = await getTransactionReceiptBundle(ctx.organization.id, transactionId)
  if (!bundle) return null
  return transactionBundleToPreviewModel(bundle, ctx.organization.name)
}
