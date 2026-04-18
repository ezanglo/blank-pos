import { resolveBrandColorToCss } from "@/lib/brand-color"
import type { BusinessLocation } from "@/lib/db/schema-app"
import type { TransactionReceiptBundle } from "@/lib/queries/transactions"
import { serializeMinor } from "@/lib/money"

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

export type PosReceiptLinePreview = {
  id: string
  productName: string
  priceLabel: string
  quantity: number
  unitPriceMinorSerialized: string
  subtotalMinorSerialized: string
  addons: {
    id: string
    name: string
    quantity: number
    subtotalMinorSerialized: string
  }[]
  instructions: { id: string; label: string }[]
}

export type PosReceiptPreviewModel = {
  displayName: string
  headerText: string | null
  footerText: string | null
  logoUrl: string | null
  borderTopColor: string | null
  locationName: string
  locationAddr: string | null
  transactionId: string
  createdAtIso: string
  cashierName: string
  paymentMethod: string
  queueNumber: number | null
  customerCallName: string | null
  lines: PosReceiptLinePreview[]
  subtotalMinorSerialized: string
  totalMinorSerialized: string
}

export function transactionBundleToPreviewModel(
  bundle: TransactionReceiptBundle,
  fallbackOrgName: string,
): PosReceiptPreviewModel {
  const { transaction, lines, location, businessDetails, cashierName } = bundle
  const bd = businessDetails
  const displayName =
    bd?.displayName?.trim() || bd?.legalName?.trim() || fallbackOrgName
  const headerText = bd?.receiptHeaderText?.trim() || null
  const footerText = bd?.receiptFooterText?.trim() || null
  const logoUrl = bd?.logoImageUrl?.trim() || null
  const borderTopColor = resolveBrandColorToCss(bd?.primaryColor ?? null)
  const addr = formatLocationAddress(location)

  return {
    displayName,
    headerText,
    footerText,
    logoUrl,
    borderTopColor,
    locationName: location.name,
    locationAddr: addr,
    transactionId: transaction.id,
    createdAtIso: transaction.createdAt.toISOString(),
    cashierName,
    paymentMethod: transaction.paymentMethod,
    queueNumber: transaction.queueNumber ?? null,
    customerCallName: transaction.customerCallName?.trim() || null,
    lines: lines.map((line) => ({
      id: line.id,
      productName: line.productName,
      priceLabel: line.priceLabel,
      quantity: line.quantity,
      unitPriceMinorSerialized: serializeMinor(line.unitPriceMinor),
      subtotalMinorSerialized: serializeMinor(line.subtotalMinor),
      addons: line.addons.map((a) => ({
        id: a.id,
        name: a.name,
        quantity: a.quantity,
        subtotalMinorSerialized: serializeMinor(a.subtotalMinor),
      })),
      instructions: line.instructions.map((i) => ({ id: i.id, label: i.label })),
    })),
    subtotalMinorSerialized: serializeMinor(transaction.subtotalAmountMinor),
    totalMinorSerialized: serializeMinor(transaction.totalAmountMinor),
  }
}
