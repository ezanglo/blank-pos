"use server"

import { randomUUID } from "node:crypto"

import { and, count, eq, max } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { organizationPaymentMethod } from "@/lib/db/schema-app"
import { paymentMethodKeyFromLabel } from "@/lib/payment-method-key"
import { getOrgForUser } from "@/lib/queries/organization"
import { listOrganizationPaymentMethodsForAdmin } from "@/lib/queries/payment-methods"
import { getServerSession } from "@/lib/server-auth"

async function requireOrgManager(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }
  return ctx
}

export async function addOrganizationPaymentMethod(
  businessSlug: string,
  label: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const ctx = await requireOrgManager(businessSlug)
    const trimmed = label.trim()
    if (trimmed.length < 1) return { ok: false, message: "Enter a name." }
    if (trimmed.length > 80) return { ok: false, message: "Name is too long." }

    const db = getDb()
    const existing = await db
      .select({ key: organizationPaymentMethod.key })
      .from(organizationPaymentMethod)
      .where(eq(organizationPaymentMethod.organizationId, ctx.organization.id))
    const keySet = new Set(existing.map((r) => r.key))
    const key = paymentMethodKeyFromLabel(trimmed, keySet)

    const [mx] = await db
      .select({ m: max(organizationPaymentMethod.sortOrder) })
      .from(organizationPaymentMethod)
      .where(eq(organizationPaymentMethod.organizationId, ctx.organization.id))
    const nextOrder = (mx?.m ?? -1) + 1

    await db.insert(organizationPaymentMethod).values({
      id: randomUUID(),
      organizationId: ctx.organization.id,
      key,
      label: trimmed,
      sortOrder: nextOrder,
      isActive: true,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong."
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return { ok: false, message: "You do not have permission to change payment methods." }
    }
    return { ok: false, message: msg }
  }
}

export async function updateOrganizationPaymentMethodLabel(
  businessSlug: string,
  methodId: string,
  label: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const ctx = await requireOrgManager(businessSlug)
    const trimmed = label.trim()
    if (trimmed.length < 1) return { ok: false, message: "Enter a name." }
    if (trimmed.length > 80) return { ok: false, message: "Name is too long." }

    const db = getDb()
    const [row] = await db
      .select({ id: organizationPaymentMethod.id })
      .from(organizationPaymentMethod)
      .where(
        and(
          eq(organizationPaymentMethod.id, methodId),
          eq(organizationPaymentMethod.organizationId, ctx.organization.id),
        ),
      )
      .limit(1)
    if (!row) return { ok: false, message: "Payment method not found." }

    await db
      .update(organizationPaymentMethod)
      .set({ label: trimmed })
      .where(
        and(
          eq(organizationPaymentMethod.id, methodId),
          eq(organizationPaymentMethod.organizationId, ctx.organization.id),
        ),
      )
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong."
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return { ok: false, message: "You do not have permission to change payment methods." }
    }
    return { ok: false, message: msg }
  }
}

export async function setOrganizationPaymentMethodActive(
  businessSlug: string,
  methodId: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const ctx = await requireOrgManager(businessSlug)
    const db = getDb()

    const [target] = await db
      .select({
        id: organizationPaymentMethod.id,
        isActive: organizationPaymentMethod.isActive,
      })
      .from(organizationPaymentMethod)
      .where(
        and(
          eq(organizationPaymentMethod.id, methodId),
          eq(organizationPaymentMethod.organizationId, ctx.organization.id),
        ),
      )
      .limit(1)
    if (!target) return { ok: false, message: "Payment method not found." }

    if (!isActive && target.isActive) {
      const [c] = await db
        .select({ n: count() })
        .from(organizationPaymentMethod)
        .where(
          and(
            eq(organizationPaymentMethod.organizationId, ctx.organization.id),
            eq(organizationPaymentMethod.isActive, true),
          ),
        )
      if ((c?.n ?? 0) <= 1) {
        return { ok: false, message: "Keep at least one active payment method for checkout." }
      }
    }

    await db
      .update(organizationPaymentMethod)
      .set({ isActive })
      .where(
        and(
          eq(organizationPaymentMethod.id, methodId),
          eq(organizationPaymentMethod.organizationId, ctx.organization.id),
        ),
      )
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong."
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return { ok: false, message: "You do not have permission to change payment methods." }
    }
    return { ok: false, message: msg }
  }
}

export async function moveOrganizationPaymentMethod(
  businessSlug: string,
  methodId: string,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const ctx = await requireOrgManager(businessSlug)
    const rows = await listOrganizationPaymentMethodsForAdmin(ctx.organization.id)
    const idx = rows.findIndex((r) => r.id === methodId)
    if (idx < 0) return { ok: false, message: "Payment method not found." }
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= rows.length) return { ok: true }

    const reordered = [...rows]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(swapIdx, 0, moved!)

    const db = getDb()
    await db.transaction(async (tx) => {
      for (let i = 0; i < reordered.length; i++) {
        await tx
          .update(organizationPaymentMethod)
          .set({ sortOrder: i })
          .where(
            and(
              eq(organizationPaymentMethod.id, reordered[i]!.id),
              eq(organizationPaymentMethod.organizationId, ctx.organization.id),
            ),
          )
      }
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong."
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return { ok: false, message: "You do not have permission to change payment methods." }
    }
    return { ok: false, message: msg }
  }
}
