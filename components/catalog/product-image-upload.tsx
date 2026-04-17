"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { uploadImageFile } from "@/lib/upload-image-client"

type ProductImageUploadProps = {
  value: string
  onChange: (url: string) => void
}

export function ProductImageUpload({ value, onChange }: ProductImageUploadProps) {
  const trimmed = value.trim()
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [pendingHint, setPendingHint] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const previewRevokeRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearPreview = useCallback(() => {
    if (previewRevokeRef.current) {
      URL.revokeObjectURL(previewRevokeRef.current)
      previewRevokeRef.current = null
    }
    setPendingPreview(null)
    setPendingHint(null)
  }, [])

  useEffect(() => () => clearPreview(), [clearPreview])

  const syncFlush = useCallback(async () => {
    await flushPendingImageUploads((_id, url) => {
      onChange(url)
      clearPreview()
    })
  }, [clearPreview, onChange])

  useEffect(() => {
    function onOnline() {
      void syncFlush()
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [syncFlush])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadError(null)
    setIsUploading(true)
    try {
      const result = await uploadImageFile(file)
      if (result.status === "uploaded") {
        clearPreview()
        onChange(result.url)
      } else {
        clearPreview()
        previewRevokeRef.current = result.previewObjectUrl
        setPendingPreview(result.previewObjectUrl)
        setPendingHint("Image will upload automatically when you are back online.")
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const displaySrc = pendingPreview || trimmed || null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={isUploading}
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Uploading…" : "Upload image file"}
        </Button>
        {pendingHint ? <p className="text-muted-foreground text-xs">{pendingHint}</p> : null}
      </div>
      {uploadError ? <p className="text-destructive text-xs">{uploadError}</p> : null}
      {displaySrc ? (
        <div className="flex items-start gap-3 rounded-xl border p-3">
          <Image
            src={displaySrc}
            alt=""
            width={96}
            height={96}
            className="border-border size-24 shrink-0 rounded-lg border bg-muted object-cover"
            referrerPolicy="no-referrer"
          />
          <p className="text-muted-foreground pt-1 text-xs">
            {pendingPreview ? "Preview (pending upload)" : "Product image preview"}
          </p>
        </div>
      ) : null}
    </div>
  )
}
