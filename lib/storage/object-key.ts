import { randomUUID } from "node:crypto"

/** Single-tenant install: flat `media/{uuid}.{ext}` (no client-supplied path segments). */
export function buildMediaObjectKey(extensionWithDot: string): string {
  return `media/${randomUUID()}${extensionWithDot}`
}
