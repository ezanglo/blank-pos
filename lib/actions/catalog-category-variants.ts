"use server"

import { randomUUID } from "node:crypto"

import { and, count, eq } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { productCategory, productCategoryVariant, productPrice } from "@/lib/db/schema-catalog"
import {
  catalogCategoryVariantCreateSchema,
  catalogCategoryVariantUpdateSchema,
} from "@/lib/schemas/catalog"

async function assertCategoryInOrg(db: ReturnType<typeof getDb>, organizationId: string, categoryId: string) {
  const [c] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(and(eq(productCategory.id, categoryId), eq(productCategory.organizationId, organizationId)))
    .limit(1)
  if (!c) throw new Error("Category not found.")
}

export async function createCategoryVariant(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryVariantCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryVariantCreateSchema.parse(raw)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, input.categoryId)
  const now = new Date()
  try {
    await db.insert(productCategoryVariant).values({
      id: randomUUID(),
      categoryId: input.categoryId,
      label: input.label,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That label already exists for this category.")
    throw e
  }
  return { ok: true as const }
}

export async function updateCategoryVariant(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryVariantUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryVariantUpdateSchema.parse(raw)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, input.categoryId)

  const [row] = await db
    .select({ id: productCategoryVariant.id })
    .from(productCategoryVariant)
    .where(
      and(eq(productCategoryVariant.id, input.id), eq(productCategoryVariant.categoryId, input.categoryId)),
    )
    .limit(1)
  if (!row) throw new Error("Variant not found.")

  try {
    await db
      .update(productCategoryVariant)
      .set({
        label: input.label,
        sortOrder: input.sortOrder ?? 0,
      })
      .where(eq(productCategoryVariant.id, input.id))
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That label already exists for this category.")
    throw e
  }

  return { ok: true as const }
}

export async function deleteCategoryVariant(businessSlug: string, categoryId: string, variantId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  await assertCategoryInOrg(db, ctx.organization.id, categoryId)

  const [row] = await db
    .select({ id: productCategoryVariant.id })
    .from(productCategoryVariant)
    .where(and(eq(productCategoryVariant.id, variantId), eq(productCategoryVariant.categoryId, categoryId)))
    .limit(1)
  if (!row) throw new Error("Variant not found.")

  const [cnt] = await db
    .select({ n: count() })
    .from(productPrice)
    .where(eq(productPrice.categoryVariantId, variantId))
  if (Number(cnt?.n ?? 0) > 0) {
    throw new Error("Remove this variant from any product’s prices before deleting it.")
  }

  await db.delete(productCategoryVariant).where(eq(productCategoryVariant.id, variantId))
  return { ok: true as const }
}
