import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization } from "./auth-schema"

/**
 * Branding and receipt-oriented copy for a store (better-auth `organization`).
 * One row per organization; PK = organization_id.
 */
export const storeBranding = pgTable("store_branding", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  tagline: text("tagline"),
  receiptHeaderText: text("receipt_header_text"),
  receiptFooterText: text("receipt_footer_text"),
  legalName: text("legal_name"),
  taxIdentifier: text("tax_identifier"),
  websiteUrl: text("website_url"),
  menuUrl: text("menu_url"),
  contactEmail: text("contact_email"),
  publicPhone: text("public_phone"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  operatingHoursText: text("operating_hours_text"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  logoStoragePath: text("logo_storage_path"),
  logoImageUrl: text("logo_image_url"),
  loginBackgroundImageUrl: text("login_background_image_url"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type StoreBranding = typeof storeBranding.$inferSelect
export type NewStoreBranding = typeof storeBranding.$inferInsert

/**
 * Physical branch for a store (`organization`). Many rows per organization_id.
 */
export const storeLocation = pgTable(
  "location",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    defaultCurrency: text("default_currency").notNull().default("PHP"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("location_organizationId_idx").on(table.organizationId),
    uniqueIndex("location_organization_slug_unique").on(table.organizationId, table.slug),
  ],
)

export type StoreLocation = typeof storeLocation.$inferSelect
export type NewStoreLocation = typeof storeLocation.$inferInsert

export const storeBrandingRelations = relations(storeBranding, ({ one }) => ({
  organization: one(organization, {
    fields: [storeBranding.organizationId],
    references: [organization.id],
  }),
}))

export const storeLocationRelations = relations(storeLocation, ({ one }) => ({
  organization: one(organization, {
    fields: [storeLocation.organizationId],
    references: [organization.id],
  }),
}))
