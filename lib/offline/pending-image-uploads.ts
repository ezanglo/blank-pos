/**
 * IndexedDB queue for image blobs when offline; replay with POST /api/upload when online.
 * Browser-only — do not import from server code.
 */

import { generateClientUuid } from "@/lib/utils"

const DB_NAME = "blank-pos-offline"
const DB_VERSION = 1
const STORE = "pendingImages"

export type PendingImageRow = {
  id: string
  blob: Blob
  mimeType: string
  createdAt: number
}

function idb(): IDBFactory | null {
  return typeof indexedDB !== "undefined" ? indexedDB : null
}

function openDb(): Promise<IDBDatabase> {
  const api = idb()
  if (!api) return Promise.reject(new Error("IndexedDB is not available."))

  return new Promise((resolve, reject) => {
    const req = api.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
  })
}

export function isLocalImageRef(value: string | null | undefined): boolean {
  return !!value?.trim().startsWith("local://")
}

export async function enqueuePendingImage(blob: Blob, mimeType: string): Promise<string> {
  const db = await openDb()
  const id = generateClientUuid()
  const row: PendingImageRow = { id, blob, mimeType, createdAt: Date.now() }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"))
    tx.objectStore(STORE).put(row)
  })
  db.close()
  return `local://${id}`
}

export async function listPendingImages(): Promise<PendingImageRow[]> {
  const db = await openDb()
  const rows = await new Promise<PendingImageRow[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as PendingImageRow[]) ?? [])
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"))
  })
  db.close()
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function removePendingImage(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"))
    tx.objectStore(STORE).delete(id)
  })
  db.close()
}

/** Upload each pending blob; invoke `onUploaded` per success; removes row after success. */
export async function flushPendingImageUploads(
  onUploaded: (id: string, url: string) => void,
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return

  const rows = await listPendingImages()
  for (const row of rows) {
    const file = new File([row.blob], "pending", { type: row.mimeType })
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" })
    if (!res.ok) continue
    const data = (await res.json()) as { url?: string }
    if (!data.url) continue
    await removePendingImage(row.id)
    onUploaded(row.id, data.url)
  }
}
