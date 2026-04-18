import { relations } from "drizzle-orm"
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization } from "./auth-schema"
import { businessLocation } from "./schema-app"

/** `all_locations` | `selected_locations_only` */
export const productAvailabilityModeValues = ["all_locations", "selected_locations_only"] as const
export type ProductAvailabilityMode = (typeof productAvailabilityModeValues)[number]

export const productCategory = pgTable(
  "product_category",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_category_organizationId_idx").on(table.organizationId)],
)

/** Preset labels (e.g. Small / Medium / Large) per category; `sort_order` drives POS ordering. */
export const productCategoryVariant = pgTable(
  "product_category_variant",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => productCategory.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_category_variant_categoryId_idx").on(table.categoryId),
    uniqueIndex("product_category_variant_category_label_unique").on(table.categoryId, table.label),
  ],
)

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => productCategory.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku"),
    /** Payload encoded in the product QR (e.g. short id or URL); POS resolves scans to this value. */
    qrCode: text("qr_code"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    isComposite: boolean("is_composite").notNull().default(false),
    trackInventory: boolean("track_inventory").notNull().default(false),
    availabilityMode: text("availability_mode").notNull().default("all_locations"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("product_organizationId_idx").on(table.organizationId),
    index("product_categoryId_idx").on(table.categoryId),
    uniqueIndex("product_organization_sku_unique").on(table.organizationId, table.sku),
  ],
)

export const productLocation = pgTable(
  "product_location",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => businessLocation.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("product_location_productId_idx").on(table.productId),
    index("product_location_locationId_idx").on(table.locationId),
    uniqueIndex("product_location_product_location_unique").on(table.productId, table.locationId),
  ],
)

export const productPrice = pgTable(
  "product_price",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** Snapshot for receipts; when `category_variant_id` is set, copied from variant at write time. */
    label: text("label").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    /** When linked to a category variant, matches `product_category_variant.sort_order` at write time. */
    sortOrder: integer("sort_order").notNull().default(0),
    categoryVariantId: text("category_variant_id").references(() => productCategoryVariant.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_price_productId_idx").on(table.productId),
    index("product_price_categoryVariantId_idx").on(table.categoryVariantId),
  ],
)

export const inventoryItem = pgTable(
  "inventory_item",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    costPerUnitMinor: bigint("cost_per_unit_minor", { mode: "bigint" }).notNull(),
    reorderPoint: integer("reorder_point"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("inventory_item_organizationId_idx").on(table.organizationId)],
)

export const inventoryStock = pgTable(
  "inventory_stock",
  {
    id: text("id").primaryKey(),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("inventory_stock_item_org_unique").on(table.inventoryItemId, table.organizationId),
  ],
)

/** Recipe line: `quantityMilli` = quantity × 1000 (three decimal places, integer-safe). */
export const productIngredient = pgTable(
  "product_ingredient",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "restrict" }),
    quantityMilli: integer("quantity_milli").notNull(),
  },
  (table) => [
    index("product_ingredient_productId_idx").on(table.productId),
    index("product_ingredient_inventoryItemId_idx").on(table.inventoryItemId),
  ],
)

export const productCategoryRelations = relations(productCategory, ({ many, one }) => ({
  organization: one(organization, {
    fields: [productCategory.organizationId],
    references: [organization.id],
  }),
  products: many(product),
  variants: many(productCategoryVariant),
}))

export const productCategoryVariantRelations = relations(productCategoryVariant, ({ one, many }) => ({
  category: one(productCategory, {
    fields: [productCategoryVariant.categoryId],
    references: [productCategory.id],
  }),
  prices: many(productPrice),
}))

export const productRelations = relations(product, ({ one, many }) => ({
  organization: one(organization, {
    fields: [product.organizationId],
    references: [organization.id],
  }),
  category: one(productCategory, {
    fields: [product.categoryId],
    references: [productCategory.id],
  }),
  locations: many(productLocation),
  prices: many(productPrice),
  ingredients: many(productIngredient),
}))

export const productLocationRelations = relations(productLocation, ({ one }) => ({
  product: one(product, {
    fields: [productLocation.productId],
    references: [product.id],
  }),
  location: one(businessLocation, {
    fields: [productLocation.locationId],
    references: [businessLocation.id],
  }),
}))

export const productPriceRelations = relations(productPrice, ({ one }) => ({
  product: one(product, {
    fields: [productPrice.productId],
    references: [product.id],
  }),
  categoryVariant: one(productCategoryVariant, {
    fields: [productPrice.categoryVariantId],
    references: [productCategoryVariant.id],
  }),
}))

export const inventoryItemRelations = relations(inventoryItem, ({ one, many }) => ({
  organization: one(organization, {
    fields: [inventoryItem.organizationId],
    references: [organization.id],
  }),
  stockRows: many(inventoryStock),
  ingredientLines: many(productIngredient),
}))

export const inventoryStockRelations = relations(inventoryStock, ({ one }) => ({
  item: one(inventoryItem, {
    fields: [inventoryStock.inventoryItemId],
    references: [inventoryItem.id],
  }),
  organization: one(organization, {
    fields: [inventoryStock.organizationId],
    references: [organization.id],
  }),
}))

export const productIngredientRelations = relations(productIngredient, ({ one }) => ({
  product: one(product, {
    fields: [productIngredient.productId],
    references: [product.id],
  }),
  inventoryItem: one(inventoryItem, {
    fields: [productIngredient.inventoryItemId],
    references: [inventoryItem.id],
  }),
}))

export type ProductCategoryRow = typeof productCategory.$inferSelect
export type ProductCategoryVariantRow = typeof productCategoryVariant.$inferSelect
export type ProductRow = typeof product.$inferSelect
export type ProductPriceRow = typeof productPrice.$inferSelect
export type InventoryItemRow = typeof inventoryItem.$inferSelect
export type InventoryStockRow = typeof inventoryStock.$inferSelect
export type ProductIngredientRow = typeof productIngredient.$inferSelect
