import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { organization, user } from "./auth-schema"

/**
 * Org-level profile: branding, legal, contact, operations, and onboarding fields.
 * One row per organization; PK = organization_id.
 */
export const businessDetails = pgTable("business_details", {
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
  businessCategory: text("business_category"),
  teamScaleBand: text("team_scale_band"),
  expectedGoLive: text("expected_go_live"),
  /** ISO 4217 code; default for new catalog prices when set. */
  defaultCurrency: text("default_currency"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type BusinessDetails = typeof businessDetails.$inferSelect
export type NewBusinessDetails = typeof businessDetails.$inferInsert

/** Person-level fields separate from better-auth `user`. */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  phone: text("phone"),
  preferredLocale: text("preferred_locale"),
  howHeard: text("how_heard"),
  primaryGoal: text("primary_goal"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type UserProfile = typeof userProfile.$inferSelect
export type NewUserProfile = typeof userProfile.$inferInsert

/**
 * Physical branch for an organization. Postgres table remains `location`.
 */
export const businessLocation = pgTable(
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

export type BusinessLocation = typeof businessLocation.$inferSelect
export type NewBusinessLocation = typeof businessLocation.$inferInsert

export const businessDetailsRelations = relations(businessDetails, ({ one }) => ({
  organization: one(organization, {
    fields: [businessDetails.organizationId],
    references: [organization.id],
  }),
}))

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}))

export const businessLocationRelations = relations(businessLocation, ({ one }) => ({
  organization: one(organization, {
    fields: [businessLocation.organizationId],
    references: [organization.id],
  }),
}))
