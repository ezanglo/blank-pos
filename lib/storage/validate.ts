import { z } from "zod"

/** ~4 MiB — stay under typical serverless body limits. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

export function extensionFromMime(contentType: string): string | null {
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return MIME_TO_EXT[base] ?? null
}

export function assertImageMimeAndSize(contentType: string, byteLength: number) {
  if (byteLength <= 0) {
    throw new Error("Empty file.")
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`File too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MiB).`)
  }
  const ext = extensionFromMime(contentType)
  if (!ext) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed.")
  }
  return ext
}

const uploadErrorSchema = z.object({
  message: z.string(),
})

export function formatUploadError(err: unknown): { status: number; body: string } {
  const msg = err instanceof Error ? err.message : "Upload failed."
  const status = msg === "Unauthorized" ? 401 : 400
  return { status, body: JSON.stringify(uploadErrorSchema.parse({ message: msg })) }
}
