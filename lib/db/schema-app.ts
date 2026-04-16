import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { organization } from "./auth-schema"

/** 1:1 with better-auth `organization.id` */
export const organizationBranding = pgTable("organization_branding", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  tagline: text("tagline"),
  primaryColor: text("primary_color").notNull().default("#171717"),
  accentColor: text("accent_color").notNull().default("#404040"),
  receiptHeaderText: text("receipt_header_text"),
  receiptFooterText: text("receipt_footer_text"),
  /** Reserved for private Storage paths (e.g. Supabase); optional. */
  logoStoragePath: text("logo_storage_path"),
  /** Optional HTTPS URL for store logo (header, login, receipts). */
  logoImageUrl: text("logo_image_url"),
  /** Optional HTTPS URL for art on the global sign-in page (see `getLoginBranding`). */
  loginBackgroundImageUrl: text("login_background_image_url"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type OrganizationBranding = typeof organizationBranding.$inferSelect
export type NewOrganizationBranding = typeof organizationBranding.$inferInsert
