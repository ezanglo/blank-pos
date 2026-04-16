import { relations } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { organization } from "./auth-schema"

/**
 * Single-row store branding (shared across orgs in v1). Optional columns cover hospitality
 * (hours, menu link, tax line) and general retail (web, social, shell colors).
 */
export const storeBranding = pgTable("store_branding", {
  id: text("id").primaryKey().default("default"),
  displayName: text("display_name"),
  tagline: text("tagline"),
  receiptHeaderText: text("receipt_header_text"),
  receiptFooterText: text("receipt_footer_text"),
  /** Registered / legal name when it differs from display name (receipts). */
  legalName: text("legal_name"),
  /** VAT, GST, ABN, etc. — optional receipt line. */
  taxIdentifier: text("tax_identifier"),
  websiteUrl: text("website_url"),
  menuUrl: text("menu_url"),
  contactEmail: text("contact_email"),
  /** Receipts / marketing when different from location phone. */
  publicPhone: text("public_phone"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  /** Freeform hours, holiday notes, or short service copy for receipts. */
  operatingHoursText: text("operating_hours_text"),
  /** Shell / theme hints (#RGB or #RRGGBB). */
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  /** Reserved for private Storage paths (e.g. Supabase); optional. */
  logoStoragePath: text("logo_storage_path"),
  /** Optional HTTPS URL for logo (header, login, receipts). */
  logoImageUrl: text("logo_image_url"),
  /** Optional HTTPS URL for sign-in page art. */
  loginBackgroundImageUrl: text("login_background_image_url"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type StoreBranding = typeof storeBranding.$inferSelect
export type NewStoreBranding = typeof storeBranding.$inferInsert

/**
 * Physical storefront for an organization. v1: exactly one row per organization (1:1).
 * Address and trading currency live here — not in organization.metadata.
 */
export const storeLocation = pgTable("location", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
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
})

export type StoreLocation = typeof storeLocation.$inferSelect
export type NewStoreLocation = typeof storeLocation.$inferInsert

export const storeLocationRelations = relations(storeLocation, ({ one }) => ({
  organization: one(organization, {
    fields: [storeLocation.organizationId],
    references: [organization.id],
  }),
}))
