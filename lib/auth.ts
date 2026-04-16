import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { admin, createAccessControl, organization, username } from "better-auth/plugins"

import { getDb } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { organizationBranding } from "@/lib/db/schema-app"
import { getServerEnv } from "@/lib/env"

const env = () => getServerEnv()

const orgStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
} as const

const orgAc = createAccessControl(orgStatements)

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  baseURL: env().BETTER_AUTH_URL,
  secret: env().BETTER_AUTH_SECRET,
  trustedOrigins: [env().BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    nextCookies(),
    username(),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    organization({
      roles: {
        manager: orgAc.newRole({
          organization: ["update"],
          member: ["create", "update", "delete"],
          invitation: [],
          team: [],
          ac: ["create", "read", "update", "delete"],
        }),
        cashier: orgAc.newRole({
          organization: [],
          member: [],
          invitation: [],
          team: [],
          ac: ["read"],
        }),
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          const db = getDb()
          await db
            .insert(organizationBranding)
            .values({
              organizationId: organization.id,
              displayName: organization.name,
              primaryColor: "#171717",
              accentColor: "#404040",
            })
            .onConflictDoNothing()
        },
      },
    }),
  ],
})
