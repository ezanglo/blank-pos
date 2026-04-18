"use server"

import { randomUUID } from "node:crypto"

import { and, eq, max } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { productCategory, productCategoryInstruction } from "@/lib/db/schema-catalog"
import {
  catalogCategoryInstructionCreateSchema,
  catalogCategoryInstructionReorderSchema,
  catalogCategoryInstructionUpdateSchema,
} from "@/lib/schemas/catalog"

async function assertCategoryInOrg(db: ReturnType<typeof getDb>, organizationId: string, categoryId: string) {
  const [c] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(and(eq(productCategory.id, categoryId), eq(productCategory.organizationId, organizationId)))
    .limit(1)
  if (!c) throw new Error("Category not found.")
}

export async function createCategoryInstruction(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryInstructionCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryInstructionCreateSchema.parse(raw)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, input.categoryId)
  const [agg] = await db
    .select({ mx: max(productCategoryInstruction.sortOrder) })
    .from(productCategoryInstruction)
    .where(eq(productCategoryInstruction.categoryId, input.categoryId))
  const nextSort =
    input.sortOrder !== undefined && input.sortOrder !== null
      ? input.sortOrder
      : (agg?.mx != null ? Number(agg.mx) : -10) + 10
  const now = new Date()
  try {
    await db.insert(productCategoryInstruction).values({
      id: randomUUID(),
      categoryId: input.categoryId,
      label: input.label,
      sortOrder: nextSort,
      createdAt: now,
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That instruction already exists for this category.")
    throw e
  }
  return { ok: true as const }
}

export async function updateCategoryInstruction(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryInstructionUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryInstructionUpdateSchema.parse(raw)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, input.categoryId)

  const [row] = await db
    .select({ id: productCategoryInstruction.id })
    .from(productCategoryInstruction)
    .where(
      and(
        eq(productCategoryInstruction.id, input.id),
        eq(productCategoryInstruction.categoryId, input.categoryId),
      ),
    )
    .limit(1)
  if (!row) throw new Error("Instruction not found.")

  const patch: { label: string; sortOrder?: number } = { label: input.label }
  if (input.sortOrder !== undefined && input.sortOrder !== null) {
    patch.sortOrder = input.sortOrder
  }

  try {
    await db.update(productCategoryInstruction).set(patch).where(eq(productCategoryInstruction.id, input.id))
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That instruction already exists for this category.")
    throw e
  }

  return { ok: true as const }
}

export async function deleteCategoryInstruction(
  businessSlug: string,
  categoryId: string,
  instructionId: string,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, categoryId)

  const [row] = await db
    .select({ id: productCategoryInstruction.id })
    .from(productCategoryInstruction)
    .where(
      and(
        eq(productCategoryInstruction.id, instructionId),
        eq(productCategoryInstruction.categoryId, categoryId),
      ),
    )
    .limit(1)
  if (!row) throw new Error("Instruction not found.")

  try {
    await db.delete(productCategoryInstruction).where(eq(productCategoryInstruction.id, instructionId))
  } catch {
    throw new Error("Cannot delete this instruction while it appears on a past sale.")
  }
  return { ok: true as const }
}

export async function reorderCategoryInstructions(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryInstructionReorderSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryInstructionReorderSchema.parse(raw)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, input.categoryId)

  const existing = await db
    .select({ id: productCategoryInstruction.id })
    .from(productCategoryInstruction)
    .where(eq(productCategoryInstruction.categoryId, input.categoryId))
  const existingIds = new Set(existing.map((r) => r.id))

  if (input.orderedIds.length !== existingIds.size) {
    throw new Error("Invalid instruction order.")
  }
  for (const id of input.orderedIds) {
    if (!existingIds.has(id)) throw new Error("Invalid instruction order.")
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < input.orderedIds.length; i++) {
      const id = input.orderedIds[i]!
      await tx
        .update(productCategoryInstruction)
        .set({ sortOrder: i * 10 })
        .where(
          and(
            eq(productCategoryInstruction.id, id),
            eq(productCategoryInstruction.categoryId, input.categoryId),
          ),
        )
    }
  })

  return { ok: true as const }
}
