import { relations } from "drizzle-orm"
import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { organization, user } from "./auth-schema"
import { businessLocation } from "./schema-app"
import { product, productAddon, productPrice } from "./schema-catalog"

/** MVP: single-step checkout persists `completed` only. */
export const transactionStatusValues = ["completed"] as const
export type TransactionStatus = (typeof transactionStatusValues)[number]

export const transactionPaymentMethodValues = ["cash", "card_placeholder"] as const
export type TransactionPaymentMethod = (typeof transactionPaymentMethodValues)[number]

/**
 * Sales header. Table name `transactions` matches the dev plan; export uses `posTransactions` to avoid confusion with `db.transaction()`.
 */
export const posTransactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => businessLocation.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("completed"),
    subtotalAmountMinor: bigint("subtotal_amount_minor", { mode: "bigint" }).notNull(),
    discountAmountMinor: bigint("discount_amount_minor", { mode: "bigint" }).notNull(),
    taxAmountMinor: bigint("tax_amount_minor", { mode: "bigint" }).notNull(),
    totalAmountMinor: bigint("total_amount_minor", { mode: "bigint" }).notNull(),
    paymentMethod: text("payment_method").notNull(),
    notes: text("notes"),
    /** Client-generated UUID for idempotent checkout (optional). */
    checkoutId: text("checkout_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_organizationId_createdAt_idx").on(table.organizationId, table.createdAt),
    index("transactions_locationId_idx").on(table.locationId),
    uniqueIndex("transactions_organization_checkout_unique")
      .on(table.organizationId, table.checkoutId)
      .where(sql`${table.checkoutId} is not null`),
  ],
)

export const posTransactionItems = pgTable(
  "transaction_items",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => posTransactions.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    productPriceId: text("product_price_id")
      .notNull()
      .references(() => productPrice.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    discountMinor: bigint("discount_minor", { mode: "bigint" }).notNull(),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull(),
  },
  (table) => [
    index("transaction_items_transactionId_idx").on(table.transactionId),
    index("transaction_items_productId_idx").on(table.productId),
  ],
)

/** Snapshot fields preserve receipt text/prices if catalog add-ons change later. */
export const posTransactionItemAddons = pgTable(
  "transaction_item_addon",
  {
    id: text("id").primaryKey(),
    transactionItemId: text("transaction_item_id")
      .notNull()
      .references(() => posTransactionItems.id, { onDelete: "cascade" }),
    addonId: text("addon_id")
      .notNull()
      .references(() => productAddon.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    quantity: integer("quantity").notNull(),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull(),
  },
  (table) => [index("transaction_item_addon_transactionItemId_idx").on(table.transactionItemId)],
)

export const posTransactionsRelations = relations(posTransactions, ({ one, many }) => ({
  organization: one(organization, {
    fields: [posTransactions.organizationId],
    references: [organization.id],
  }),
  location: one(businessLocation, {
    fields: [posTransactions.locationId],
    references: [businessLocation.id],
  }),
  cashier: one(user, {
    fields: [posTransactions.userId],
    references: [user.id],
  }),
  items: many(posTransactionItems),
}))

export const posTransactionItemsRelations = relations(posTransactionItems, ({ one, many }) => ({
  transaction: one(posTransactions, {
    fields: [posTransactionItems.transactionId],
    references: [posTransactions.id],
  }),
  product: one(product, {
    fields: [posTransactionItems.productId],
    references: [product.id],
  }),
  productPrice: one(productPrice, {
    fields: [posTransactionItems.productPriceId],
    references: [productPrice.id],
  }),
  addons: many(posTransactionItemAddons),
}))

export const posTransactionItemAddonsRelations = relations(posTransactionItemAddons, ({ one }) => ({
  transactionItem: one(posTransactionItems, {
    fields: [posTransactionItemAddons.transactionItemId],
    references: [posTransactionItems.id],
  }),
  addon: one(productAddon, {
    fields: [posTransactionItemAddons.addonId],
    references: [productAddon.id],
  }),
}))

export type PosTransactionRow = typeof posTransactions.$inferSelect
export type PosTransactionItemRow = typeof posTransactionItems.$inferSelect
export type PosTransactionItemAddonRow = typeof posTransactionItemAddons.$inferSelect
