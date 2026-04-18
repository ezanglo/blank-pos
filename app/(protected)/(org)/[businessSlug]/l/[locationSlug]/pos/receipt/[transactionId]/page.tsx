import "./receipt-print.css"

import type { CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PrintReceiptButton } from "@/components/pos/print-receipt-button"
import { resolveBrandColorToCss } from "@/lib/brand-color"
import type { BusinessLocation } from "@/lib/db/schema-app"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getTransactionReceiptBundle } from "@/lib/queries/transactions"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function formatLocationAddress(loc: BusinessLocation): string | null {
  const parts = [
    loc.addressLine1,
    loc.addressLine2,
    [loc.city, loc.region].filter(Boolean).join(", "),
    loc.postalCode,
  ].filter((p) => p && String(p).trim().length > 0)
  if (parts.length === 0) return null
  return parts.join("\n")
}

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

  const { transaction, lines, location, businessDetails, cashierName } = bundle
  const displayName =
    businessDetails?.displayName?.trim() || businessDetails?.legalName?.trim() || ctx.organization.name
  const headerText = businessDetails?.receiptHeaderText?.trim() || null
  const footerText = businessDetails?.receiptFooterText?.trim() || null
  const logoUrl = businessDetails?.logoImageUrl?.trim() || null
  const primaryCss = resolveBrandColorToCss(businessDetails?.primaryColor ?? null)
  const addr = formatLocationAddress(location)

  const posHref = `/${businessSlug}/l/${locationSlug}/pos`

  const rootStyle: CSSProperties | undefined = primaryCss ? { borderTopColor: primaryCss } : undefined

  return (
    <div className="mx-auto max-w-md py-4">
      <div
        id="pos-receipt-root"
        className="rounded-2xl border border-t-4 border-border bg-card p-6 shadow-sm"
        style={rootStyle}
      >
        {logoUrl ? (
          <div className="relative mx-auto mb-4 h-16 w-40">
            <Image src={logoUrl} alt="" fill className="object-contain" sizes="160px" unoptimized />
          </div>
        ) : null}
        <h1 className="text-center text-xl font-bold tracking-tight">{displayName}</h1>
        {headerText ? <p className="mt-2 whitespace-pre-line text-center text-sm text-muted-foreground">{headerText}</p> : null}
        <div className="mt-4 border-t pt-4 text-sm">
          <p className="font-medium">{location.name}</p>
          {addr ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{addr}</p> : null}
        </div>
        <dl className="mt-4 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Transaction</dt>
            <dd className="font-mono text-xs">{transaction.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{transaction.createdAt.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Cashier</dt>
            <dd>{cashierName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="capitalize">{transaction.paymentMethod.replace(/_/g, " ")}</dd>
          </div>
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">Item</th>
              <th className="pb-2 px-1 text-center font-medium">Qty</th>
              <th className="pb-2 pl-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border/60">
                <td className="py-2 pr-2 align-top">
                  <div className="font-medium">{line.productName}</div>
                  <div className="text-xs text-muted-foreground">{line.priceLabel}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatMinorToDecimal2(line.unitPriceMinor)} each
                  </div>
                  {line.addons.length > 0 ? (
                    <ul className="mt-1.5 list-none space-y-0.5 pl-0 text-xs text-muted-foreground">
                      {line.addons.map((a) => (
                        <li key={a.id} className="tabular-nums">
                          + {a.name}
                          {a.quantity !== 1 ? ` ×${a.quantity}` : ""} ·{" "}
                          {formatMinorToDecimal2(a.subtotalMinor)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="py-2 px-1 text-center align-top tabular-nums">{line.quantity}</td>
                <td className="py-2 pl-2 text-right align-top font-medium tabular-nums">
                  {formatMinorToDecimal2(line.subtotalMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatMinorToDecimal2(transaction.subtotalAmountMinor)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMinorToDecimal2(transaction.totalAmountMinor)}</span>
          </div>
        </div>

        {footerText ? (
          <p className="mt-6 whitespace-pre-line text-center text-xs text-muted-foreground">{footerText}</p>
        ) : null}

        <div className="no-print mt-8 flex flex-wrap gap-2">
          <PrintReceiptButton />
          <Link
            href={posHref}
            className="inline-flex h-9 items-center justify-center rounded-4xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Back to register
          </Link>
        </div>
      </div>
      <p className="no-print mt-4 text-center text-xs text-muted-foreground">
        For best results, enable background graphics in the print dialog if you want logo colors.
      </p>
    </div>
  )
}
