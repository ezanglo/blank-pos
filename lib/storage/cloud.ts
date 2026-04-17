import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { getServerEnv } from "@/lib/env"

import type { StorageProvider, StorageUploadParams } from "./storage-provider"

function forcePathStyle(): boolean {
  const v = getServerEnv().STORAGE_FORCE_PATH_STYLE
  return v === "1" || v === "true"
}

function client() {
  const env = getServerEnv()
  const endpoint = env.STORAGE_ENDPOINT
  const region = env.STORAGE_REGION || "auto"
  const accessKeyId = env.STORAGE_ACCESS_KEY
  const secretAccessKey = env.STORAGE_SECRET_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloud storage is missing STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, or STORAGE_SECRET_KEY.")
  }
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: forcePathStyle(),
  })
}

export class CloudStorageProvider implements StorageProvider {
  async upload({ body, contentType, objectKey }: StorageUploadParams): Promise<string> {
    const env = getServerEnv()
    const bucket = env.STORAGE_BUCKET
    const base = env.STORAGE_PUBLIC_URL_BASE
    if (!bucket) throw new Error("STORAGE_BUCKET is required for cloud storage.")
    if (!base) throw new Error("STORAGE_PUBLIC_URL_BASE is required for cloud storage.")

    await client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    )

    const prefix = base.replace(/\/$/, "")
    return `${prefix}/${objectKey}`
  }

  async deleteByPublicUrl(url: string): Promise<void> {
    const env = getServerEnv()
    const bucket = env.STORAGE_BUCKET
    const base = env.STORAGE_PUBLIC_URL_BASE
    if (!bucket || !base) return

    const prefix = base.replace(/\/$/, "")
    if (!url.startsWith(prefix + "/") && !url.startsWith(prefix)) return
    const key = url.startsWith(prefix + "/") ? url.slice(prefix.length + 1) : url.slice(prefix.length)
    if (!key) return

    try {
      await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    } catch {
      // ignore
    }
  }
}
