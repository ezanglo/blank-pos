import Link from "next/link"
import { notFound } from "next/navigation"

import { PosReceiptDocument } from "@/components/pos/pos-receipt-document"
import { PrintReceiptButton } from "@/components/pos/print-receipt-button"
import { transactionBundleToPreviewModel } from "@/lib/pos/receipt-preview"
import { getOrgForUser } from "@/lib/queries/organization"
import { getTransactionReceiptBundle } from "@/lib/queries/transactions"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function PosReceiptPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string; transactionId: string }>
}) {
  const { businessSlug, locationSlug, transactionId } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()

  const bundle = await getTransactionReceiptBundle(ctx.organization.id, transactionId)
  if (!bundle) notFound()

  const model = transactionBundleToPreviewModel(bundle, ctx.organization.name)
  const posHref = `/${businessSlug}/l/${locationSlug}/pos`

  return (
    <div className="mx-auto max-w-md py-4">
      <PosReceiptDocument
        model={model}
        footerSlot={
          <>
            <PrintReceiptButton />
            <Link
              href={posHref}
              className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Back to register
            </Link>
          </>
        }
        belowSlot={
          <p className="mt-4 text-center text-xs text-muted-foreground">
            For best results, enable background graphics in the print dialog if you want logo colors.
          </p>
        }
      />
    </div>
  )
}
