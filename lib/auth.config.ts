/**
 * Used by `@better-auth/cli generate` only.
 * Run: `DATABASE_URL=... BETTER_AUTH_SECRET=... pnpm auth:schema`
 */
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, createAccessControl, organization, username } from "better-auth/plugins"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL is required for auth schema generation")
}

const client = postgres(url, { max: 1, prepare: false })
const db = drizzle(client)

const orgStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
} as const

const orgAc = createAccessControl(orgStatements)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "0".repeat(32),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true },
  plugins: [
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
    }),
    username(),
    admin(),
  ],
})
