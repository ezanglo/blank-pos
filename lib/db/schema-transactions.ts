import { relations } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { bigint, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { organization, user } from "./auth-schema"
import { businessLocation } from "./schema-app"
import { product, productAddon, productCategoryInstruction, productPrice } from "./schema-catalog"

/** MVP: single-step checkout persists `completed` only. */
export const transactionStatusValues = ["completed"] as const
export type TransactionStatus = (typeof transactionStatusValues)[number]

/** Human-readable copy for UI; option `value` stays the DB enum string. */
export const transactionStatusLabels: Record<TransactionStatus, string> = {
  completed: "Completed",
}

export function formatTransactionStatus(status: string): string {
  return (transactionStatusValues as readonly string[]).includes(status)
    ? transactionStatusLabels[status as TransactionStatus]
    : status
}

export const transactionPaymentMethodValues = ["cash", "card_placeholder"] as const
export type TransactionPaymentMethod = (typeof transactionPaymentMethodValues)[number]

/**
 * Per-branch daily sequence for café-style queue tickets. `queue_date` is UTC calendar date (YYYY-MM-DD).
 * Allocated inside the same DB transaction as the sale via upsert + increment.
 */
export const locationQueueCounter = pgTable(
  "location_queue_counter",
  {
    locationId: text("location_id")
      .notNull()
      .references(() => businessLocation.id, { onDelete: "cascade" }),
    queueDate: text("queue_date").notNull(),
    lastNumber: integer("last_number").notNull(),
  },
  (t) => [primaryKey({ columns: [t.locationId, t.queueDate] })],
)

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
    /** Daily queue ticket for this branch (see `location_queue_counter`). */
    queueNumber: integer("queue_number"),
    /** Name staff call out for the order (e.g. Starbucks-style). */
    customerCallName: text("customer_call_name"),
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

/** Snapshot label for kitchen/receipt; does not affect line subtotal. */
export const posTransactionItemInstructions = pgTable(
  "transaction_item_instruction",
  {
    id: text("id").primaryKey(),
    transactionItemId: text("transaction_item_id")
      .notNull()
      .references(() => posTransactionItems.id, { onDelete: "cascade" }),
    instructionId: text("instruction_id")
      .notNull()
      .references(() => productCategoryInstruction.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("transaction_item_instruction_transactionItemId_idx").on(table.transactionItemId),
  ],
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
  instructions: many(posTransactionItemInstructions),
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

export const posTransactionItemInstructionsRelations = relations(posTransactionItemInstructions, ({ one }) => ({
  transactionItem: one(posTransactionItems, {
    fields: [posTransactionItemInstructions.transactionItemId],
    references: [posTransactionItems.id],
  }),
  instruction: one(productCategoryInstruction, {
    fields: [posTransactionItemInstructions.instructionId],
    references: [productCategoryInstruction.id],
  }),
}))

export type PosTransactionRow = typeof posTransactions.$inferSelect
export type PosTransactionItemRow = typeof posTransactionItems.$inferSelect
export type PosTransactionItemAddonRow = typeof posTransactionItemAddons.$inferSelect
export type PosTransactionItemInstructionRow = typeof posTransactionItemInstructions.$inferSelect
