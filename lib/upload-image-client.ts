"use client"

import { enqueuePendingImage, flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"

export type UploadImageResult =
  | { status: "uploaded"; url: string }
  | { status: "queued"; localRef: string; previewObjectUrl: string }

/**
 * Uploads an image when online; when offline, stores the blob in IndexedDB and returns a `local://` ref
 * plus a temporary `blob:` URL for preview (revoke after you swap in the real URL).
 */
export async function uploadImageFile(file: File): Promise<UploadImageResult> {
  const online = typeof navigator !== "undefined" && navigator.onLine

  if (online) {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" })
    const data = (await res.json().catch(() => ({}))) as { message?: string; url?: string }
    if (!res.ok) {
      throw new Error(data.message || "Upload failed")
    }
    if (!data.url) throw new Error("Upload failed: missing url")
    return { status: "uploaded", url: data.url }
  }

  const mime = file.type || "application/octet-stream"
  const localRef = await enqueuePendingImage(file, mime)
  const previewObjectUrl = URL.createObjectURL(file)
  return { status: "queued", localRef, previewObjectUrl }
}
