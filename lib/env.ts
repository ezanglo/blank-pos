import { z } from "zod"

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  /** `local` = public/uploads (dev only). Anything else = S3-compatible cloud (required on Vercel). */
  STORAGE_MODE: z.enum(["local", "cloud"]).optional(),
  STORAGE_ENDPOINT: z.url().optional(),
  STORAGE_BUCKET: z.string().min(1).optional(),
  STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_SECRET_KEY: z.string().min(1).optional(),
  STORAGE_REGION: z.string().optional(),
  /** Set `1` or `true` for MinIO and many S3-compatible hosts. */
  STORAGE_FORCE_PATH_STYLE: z.string().optional(),
  /** Public base URL for objects (no trailing slash), e.g. https://cdn.example.com or https://bucket.r2.cloudflarestorage.com */
  STORAGE_PUBLIC_URL_BASE: z.url().optional(),
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
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    STORAGE_MODE: process.env.STORAGE_MODE as "local" | "cloud" | undefined,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
    STORAGE_REGION: process.env.STORAGE_REGION,
    STORAGE_FORCE_PATH_STYLE: process.env.STORAGE_FORCE_PATH_STYLE,
    STORAGE_PUBLIC_URL_BASE: process.env.STORAGE_PUBLIC_URL_BASE,
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
