import { Buffer } from "node:buffer"

import { auth } from "@/lib/auth"
import { buildMediaObjectKey, getStorageProvider, assertImageMimeAndSize } from "@/lib/storage"

export type UploadHandlerResult =
  | { ok: true; url: string }
  | { ok: false; status: number; body: string }

export async function runUploadHandler(request: Request): Promise<UploadHandlerResult> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return { ok: false, status: 401, body: JSON.stringify({ message: "Unauthorized" }) }
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return { ok: false, status: 400, body: JSON.stringify({ message: "Expected multipart form data." }) }
  }

  const entry = form.get("file")
  if (!entry || typeof entry === "string") {
    return { ok: false, status: 400, body: JSON.stringify({ message: "Missing file field." }) }
  }

  const file = entry as File
  const rawType = file.type || "application/octet-stream"
  const contentType = rawType.split(";")[0]?.trim() || rawType
  const buf = Buffer.from(await file.arrayBuffer())

  let ext: string
  try {
    ext = assertImageMimeAndSize(contentType, buf.length)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file."
    return { ok: false, status: 400, body: JSON.stringify({ message: msg }) }
  }

  try {
    const provider = getStorageProvider()
    const objectKey = buildMediaObjectKey(ext)
    const url = await provider.upload({
      body: buf,
      contentType,
      objectKey,
    })
    return { ok: true, url }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed."
    return { ok: false, status: 500, body: JSON.stringify({ message: msg }) }
  }
}
