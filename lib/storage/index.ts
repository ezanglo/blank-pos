import { getServerEnv } from "@/lib/env"

import { CloudStorageProvider } from "./cloud"
import { LocalStorageProvider } from "./local"
import type { StorageProvider } from "./storage-provider"

export type { StorageProvider, StorageUploadParams } from "./storage-provider"
export { buildMediaObjectKey } from "./object-key"
export { assertImageMimeAndSize, extensionFromMime, MAX_IMAGE_BYTES } from "./validate"

export function getStorageMode(): "local" | "cloud" {
  const env = getServerEnv()
  if (process.env.VERCEL === "1" && env.STORAGE_MODE === "local") {
    throw new Error("STORAGE_MODE=local is not supported on Vercel. Use cloud object storage.")
  }
  if (env.STORAGE_MODE === "local") return "local"
  if (env.STORAGE_MODE === "cloud") return "cloud"
  // Unset: default to local off Vercel for frictionless dev; Vercel/production expects explicit cloud env.
  if (process.env.VERCEL !== "1" && !env.STORAGE_BUCKET) return "local"
  return "cloud"
}

function assertCloudEnvConfigured() {
  const env = getServerEnv()
  const missing: string[] = []
  if (!env.STORAGE_ENDPOINT) missing.push("STORAGE_ENDPOINT")
  if (!env.STORAGE_BUCKET) missing.push("STORAGE_BUCKET")
  if (!env.STORAGE_ACCESS_KEY) missing.push("STORAGE_ACCESS_KEY")
  if (!env.STORAGE_SECRET_KEY) missing.push("STORAGE_SECRET_KEY")
  if (!env.STORAGE_PUBLIC_URL_BASE) missing.push("STORAGE_PUBLIC_URL_BASE")
  if (missing.length) {
    throw new Error(`Cloud storage requires: ${missing.join(", ")}`)
  }
}

export function getStorageProvider(): StorageProvider {
  if (getStorageMode() === "local") return new LocalStorageProvider()
  assertCloudEnvConfigured()
  return new CloudStorageProvider()
}
