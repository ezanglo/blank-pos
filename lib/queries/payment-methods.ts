import { randomUUID } from "node:crypto"

import { and, asc, count, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import {
  organizationPaymentMethod,
  type OrganizationPaymentMethod,
} from "@/lib/db/schema-app"

export type PaymentMethodOption = { key: string; label: string }

const DEFAULT_ROWS: Pick<
  OrganizationPaymentMethod,
  "key" | "label" | "sortOrder" | "isActive"
>[] = [
  { key: "cash", label: "Cash", sortOrder: 0, isActive: true },
  { key: "card_placeholder", label: "Card (not processed)", sortOrder: 1, isActive: true },
]

export async function ensureDefaultPaymentMethodsForOrganization(organizationId: string): Promise<void> {
  const db = getDb()
  const [c] = await db
    .select({ n: count() })
    .from(organizationPaymentMethod)
    .where(eq(organizationPaymentMethod.organizationId, organizationId))
  if ((c?.n ?? 0) > 0) return

  const now = new Date()
  await db.insert(organizationPaymentMethod).values(
    DEFAULT_ROWS.map((row) => ({
      id: randomUUID(),
      organizationId,
      key: row.key,
      label: row.label,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: now,
    })),
  )
}

export async function listActivePaymentMethodOptions(
  organizationId: string,
): Promise<PaymentMethodOption[]> {
  await ensureDefaultPaymentMethodsForOrganization(organizationId)
  const db = getDb()
  return db
    .select({
      key: organizationPaymentMethod.key,
      label: organizationPaymentMethod.label,
    })
    .from(organizationPaymentMethod)
    .where(
      and(
        eq(organizationPaymentMethod.organizationId, organizationId),
        eq(organizationPaymentMethod.isActive, true),
      ),
    )
    .orderBy(asc(organizationPaymentMethod.sortOrder), asc(organizationPaymentMethod.key))
}

export async function listActivePaymentMethodKeySet(organizationId: string): Promise<Set<string>> {
  const rows = await listActivePaymentMethodOptions(organizationId)
  return new Set(rows.map((r) => r.key))
}

export async function listOrganizationPaymentMethodsForAdmin(
  organizationId: string,
): Promise<OrganizationPaymentMethod[]> {
  await ensureDefaultPaymentMethodsForOrganization(organizationId)
  const db = getDb()
  return db
    .select()
    .from(organizationPaymentMethod)
    .where(eq(organizationPaymentMethod.organizationId, organizationId))
    .orderBy(asc(organizationPaymentMethod.sortOrder), asc(organizationPaymentMethod.createdAt))
}

export async function getPaymentMethodLabelMap(organizationId: string): Promise<Record<string, string>> {
  await ensureDefaultPaymentMethodsForOrganization(organizationId)
  const db = getDb()
  const rows = await db
    .select({
      key: organizationPaymentMethod.key,
      label: organizationPaymentMethod.label,
    })
    .from(organizationPaymentMethod)
    .where(eq(organizationPaymentMethod.organizationId, organizationId))
  const map: Record<string, string> = {}
  for (const r of rows) {
    map[r.key] = r.label
  }
  return map
}

export function resolvePaymentMethodDisplay(key: string, labelMap: Record<string, string>): string {
  const label = labelMap[key]?.trim()
  if (label) return label
  if (!key) return "—"
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
