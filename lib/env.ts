import { z } from "zod"

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().optional().default("http://localhost:3000"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  /** Browser-safe key (`sb_publishable_…`). Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still read as a fallback. */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

function parseServerEnv(): ServerEnv {
  const skip = process.env.SKIP_ENV_VALIDATION === "1"
  const parsed = serverSchema.safeParse({
    DATABASE_URL:
      process.env.DATABASE_URL ||
      (skip ? "postgresql://127.0.0.1:5432/placeholder" : undefined),
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ||
      (skip ? "00000000000000000000000000000000" : undefined),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`)
  }
  return parsed.data
}

let cached: ServerEnv | null = null

/** Call only on server (API routes, server actions). */
export function getServerEnv(): ServerEnv {
  if (cached) return cached
  cached = parseServerEnv()
  return cached
}

/** Safe for build: returns null if env invalid (e.g. CI build without DB). */
export function tryGetServerEnv(): ServerEnv | null {
  try {
    return getServerEnv()
  } catch {
    return null
  }
}
