import { relations, sql } from "drizzle-orm"
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { organization, user } from "./auth-schema"
import { inventoryItem } from "./schema-catalog"
import { posTransactionItems } from "./schema-transactions"

export const inventoryMovementTypeValues = ["in", "out", "adjustment"] as const
export type InventoryMovementType = (typeof inventoryMovementTypeValues)[number]

/**
 * Stock audit trail. `reference_id` = `transaction_items.id` for sale deductions (`out`).
 * `adjustment` uses signed `quantity` as delta to `inventory_stock.quantity`.
 */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "restrict" }),
    type: text("type").notNull().$type<InventoryMovementType>(),
    /** For `out`/`in`: positive units. For `adjustment`: signed delta applied to stock. */
    quantity: integer("quantity").notNull(),
    /** e.g. `transaction_items.id` for composite sale `out` rows. */
    referenceId: text("reference_id"),
    note: text("note"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_movements_item_org_created_idx").on(
      table.inventoryItemId,
      table.organizationId,
      table.createdAt,
    ),
    index("inventory_movements_organizationId_createdAt_idx").on(table.organizationId, table.createdAt),
    uniqueIndex("inventory_movements_sale_line_item_unique")
      .on(table.referenceId, table.inventoryItemId)
      .where(sql`${table.type} = 'out' and ${table.referenceId} is not null`),
  ],
)

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  organization: one(organization, {
    fields: [inventoryMovements.organizationId],
    references: [organization.id],
  }),
  inventoryItem: one(inventoryItem, {
    fields: [inventoryMovements.inventoryItemId],
    references: [inventoryItem.id],
  }),
  user: one(user, {
    fields: [inventoryMovements.userId],
    references: [user.id],
  }),
  transactionItem: one(posTransactionItems, {
    fields: [inventoryMovements.referenceId],
    references: [posTransactionItems.id],
  }),
}))

export type InventoryMovementRow = typeof inventoryMovements.$inferSelect
