"use client"

import type { CSSProperties, ReactNode } from "react"
import Image from "next/image"

import { PrintReceiptButton } from "@/components/pos/print-receipt-button"
import { formatOrderNumberLabel } from "@/lib/format-order-number"
import { formatMinorToDecimal2, parseMinorFromSerialized } from "@/lib/money"
import type { PosReceiptPreviewModel } from "@/lib/pos/receipt-preview"
import { cn } from "@/lib/utils"

export function PosReceiptDocument({
  model,
  className,
  footerSlot,
  belowSlot,
}: {
  model: PosReceiptPreviewModel
  className?: string
  /** e.g. Print + Back to register (full page) or Print + Close sheet */
  footerSlot?: ReactNode
  /** Hint text under the card (no-print) */
  belowSlot?: ReactNode
}) {
  const rootStyle: CSSProperties | undefined = model.borderTopColor
    ? { borderTopColor: model.borderTopColor }
    : undefined

  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div
        id="pos-receipt-root"
        className="rounded-2xl border border-t-4 border-border bg-card p-6 shadow-sm"
        style={rootStyle}
      >
        {model.logoUrl ? (
          <div className="relative mx-auto mb-4 h-16 w-40">
            <Image
              src={model.logoUrl}
              alt=""
              fill
              className="object-contain"
              sizes="160px"
              unoptimized
            />
          </div>
        ) : null}
        <h1 className="text-center text-xl font-bold tracking-tight">{model.displayName}</h1>
        {model.headerText ? (
          <p className="mt-2 whitespace-pre-line text-center text-sm text-muted-foreground">
            {model.headerText}
          </p>
        ) : null}
        <div className="mt-4 border-t pt-4 text-sm">
          <p className="font-medium">{model.locationName}</p>
          {model.locationAddr ? (
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{model.locationAddr}</p>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Transaction</dt>
            <dd className="font-mono text-xs">{model.transactionId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{new Date(model.createdAtIso).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Cashier</dt>
            <dd>{model.cashierName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="capitalize">{model.paymentMethod.replace(/_/g, " ")}</dd>
          </div>
          {model.queueNumber != null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Order #</dt>
              <dd className="text-lg font-bold tabular-nums">
                {formatOrderNumberLabel(new Date(model.createdAtIso), model.queueNumber)}
              </dd>
            </div>
          ) : null}
          {model.customerCallName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="min-w-0 text-right font-medium break-words">{model.customerCallName}</dd>
            </div>
          ) : null}
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
            {model.lines.map((line) => (
              <tr key={line.id} className="border-b border-border/60">
                <td className="py-2 pr-2 align-top">
                  <div className="font-medium">{line.productName}</div>
                  <div className="text-xs text-muted-foreground">{line.priceLabel}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatMinorToDecimal2(parseMinorFromSerialized(line.unitPriceMinorSerialized))} each
                  </div>
                  {line.addons.length > 0 ? (
                    <ul className="mt-1.5 list-none space-y-0.5 pl-0 text-xs text-muted-foreground">
                      {line.addons.map((a) => (
                        <li key={a.id} className="tabular-nums">
                          + {a.name}
                          {a.quantity !== 1 ? ` ×${a.quantity}` : ""} ·{" "}
                          {formatMinorToDecimal2(parseMinorFromSerialized(a.subtotalMinorSerialized))}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {line.instructions.length > 0 ? (
                    <ul className="mt-1.5 list-none space-y-0.5 pl-0 text-xs text-muted-foreground">
                      {line.instructions.map((ins) => (
                        <li key={ins.id}>Kitchen: {ins.label}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="py-2 px-1 text-center align-top tabular-nums">{line.quantity}</td>
                <td className="py-2 pl-2 text-right align-top font-medium tabular-nums">
                  {formatMinorToDecimal2(parseMinorFromSerialized(line.subtotalMinorSerialized))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              {formatMinorToDecimal2(parseMinorFromSerialized(model.subtotalMinorSerialized))}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMinorToDecimal2(parseMinorFromSerialized(model.totalMinorSerialized))}
            </span>
          </div>
        </div>

        {model.footerText ? (
          <p className="mt-6 whitespace-pre-line text-center text-xs text-muted-foreground">
            {model.footerText}
          </p>
        ) : null}

        {footerSlot ? (
          <div className="no-print mt-8 flex flex-wrap gap-2">{footerSlot}</div>
        ) : null}
      </div>
      {belowSlot ? <div className="no-print">{belowSlot}</div> : null}
    </div>
  )
}
