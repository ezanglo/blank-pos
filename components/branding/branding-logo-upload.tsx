"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type Control,
  type FieldValues,
  type Path,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { uploadImageFile } from "@/lib/upload-image-client"

type LogoForm = FieldValues & { logoImageUrl?: string | undefined }

type BrandingLogoUploadProps<T extends LogoForm> = {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** Field name for logo URL (default `logoImageUrl`). */
  name?: Path<T>
}

export function BrandingLogoUpload<T extends LogoForm>({
  control,
  setValue,
  name = "logoImageUrl" as Path<T>,
}: BrandingLogoUploadProps<T>) {
  const fieldName = name
  const logoUrl = useWatch({ control, name: fieldName })?.trim() || null
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
      setValue(fieldName, url as never, { shouldValidate: true, shouldDirty: true })
      clearPreview()
    })
  }, [clearPreview, fieldName, setValue])

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
        setValue(fieldName, result.url as never, { shouldValidate: true, shouldDirty: true })
      } else {
        clearPreview()
        previewRevokeRef.current = result.previewObjectUrl
        setPendingPreview(result.previewObjectUrl)
        setPendingHint("Logo will upload automatically when you are back online.")
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const displaySrc = pendingPreview || logoUrl

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
          {isUploading ? "Uploading…" : "Upload logo file"}
        </Button>
        {pendingHint ? <p className="text-xs text-muted-foreground">{pendingHint}</p> : null}
      </div>
      {uploadError ? <p className="text-destructive text-xs">{uploadError}</p> : null}
      {displaySrc ? (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary https or blob: URLs */}
          <img
            src={displaySrc}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-md border bg-muted object-contain p-1"
          />
          <p className="text-xs text-muted-foreground">
            {pendingPreview ? "Preview (pending upload)" : "Logo preview"}
          </p>
        </div>
      ) : null}
    </div>
  )
}
