"use server"

import { randomUUID } from "node:crypto"

import { and, count, eq } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { product, productCategory } from "@/lib/db/schema-catalog"
import {
  catalogCategoryCreateSchema,
  catalogCategoryUpdateSchema,
} from "@/lib/schemas/catalog"

export async function createProductCategory(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryCreateSchema.parse(raw)
  const db = getDb()
  const id = randomUUID()
  await db.insert(productCategory).values({
    id,
    organizationId: ctx.organization.id,
    name: input.name,
    color: input.color?.trim() || null,
    icon: input.icon?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
  })
  return { ok: true as const, id }
}

export async function updateProductCategory(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryUpdateSchema.parse(raw)
  const db = getDb()
  const [row] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(
      and(eq(productCategory.id, input.id), eq(productCategory.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Category not found.")

  await db
    .update(productCategory)
    .set({
      name: input.name,
      color: input.color?.trim() || null,
      icon: input.icon?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    })
    .where(eq(productCategory.id, input.id))

  return { ok: true as const }
}

export async function deleteProductCategory(businessSlug: string, categoryId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  const [row] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(
      and(eq(productCategory.id, categoryId), eq(productCategory.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Category not found.")

  const [cnt] = await db.select({ n: count() }).from(product).where(eq(product.categoryId, categoryId))
  if (Number(cnt?.n ?? 0) > 0) {
    throw new Error("Move or delete products in this category before deleting it.")
  }

  await db.delete(productCategory).where(eq(productCategory.id, categoryId))
  return { ok: true as const }
}
