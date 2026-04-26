import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PaymentMethodsAdminPanel } from "@/components/business/payment-methods-admin-panel"
import { listOrganizationPaymentMethodsForAdmin } from "@/lib/queries/payment-methods"
import { getOrgForUser } from "@/lib/queries/organization"
import { userCanEditBusinessDetailsForOrganization } from "@/lib/queries/stores"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Payment methods",
  description: "Configure tender types for checkout and receipts.",
}

export default async function PaymentMethodsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()

  const allowed = await userCanEditBusinessDetailsForOrganization(session.user.id, ctx.organization.id)
  if (!allowed) notFound()

  const rows = await listOrganizationPaymentMethodsForAdmin(ctx.organization.id)
  const methods = rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    isActive: r.isActive,
  }))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment methods</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Methods available at the register and the label printed on customer receipts. Owners and managers can manage
          this list; cashiers use whatever is active here.
        </p>
      </div>
      <PaymentMethodsAdminPanel businessSlug={businessSlug} methods={methods} />
    </div>
  )
}
