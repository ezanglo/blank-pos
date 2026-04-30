import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UUID v4 for client idempotency keys (e.g. POS checkout).
 * Uses `getRandomValues` when `randomUUID` is missing — common on non-secure origins
 * (`http://192.168.x.x`), where `randomUUID` is unavailable but GET random bytes still works.
 */
export function generateClientUuid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    const v = ch === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
