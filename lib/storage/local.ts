import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import type { StorageProvider, StorageUploadParams } from "./storage-provider"

function publicUploadsRoot() {
  return path.join(process.cwd(), "public", "uploads")
}

function absoluteFilePath(objectKey: string) {
  const root = publicUploadsRoot()
  const resolved = path.join(root, objectKey)
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid object key.")
  }
  return resolved
}

function pathnameFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.pathname
  } catch {
    if (url.startsWith("/")) return url
    return null
  }
}

export class LocalStorageProvider implements StorageProvider {
  /** Same-origin path, e.g. `/uploads/media/uuid.png` */
  async upload({ body, objectKey }: StorageUploadParams): Promise<string> {
    const dest = absoluteFilePath(objectKey)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, body)
    const posixKey = objectKey.split(path.sep).join("/")
    return `/uploads/${posixKey}`
  }

  async deleteByPublicUrl(url: string): Promise<void> {
    const pathname = pathnameFromPublicUrl(url)
    if (!pathname?.startsWith("/uploads/")) return
    const key = pathname.slice("/uploads/".length)
    if (!key || key.includes("..")) return
    try {
      await unlink(absoluteFilePath(key))
    } catch {
      // ignore missing file
    }
  }
}
