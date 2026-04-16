"use client"

import Image from "next/image"
import { useWatch, type Control } from "react-hook-form"

import { TextFormField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { type SetupBrandingFormValues } from "@/lib/schemas/app-forms"

export function SetupBrandingFields({
  control,
}: {
  control: Control<SetupBrandingFormValues>
}) {
  const logoPreview =
    useWatch({ control, name: "logoImageUrl" })?.trim() || null

  return (
    <FieldGroup>
      <TextFormField
        control={control}
        name="displayName"
        label="Store name"
        description="How your store shows up in the app and on the sign-in page. The next step is only for this shop’s name and address—they can be different."
      />
      <TextFormField
        control={control}
        name="logoImageUrl"
        label="Logo image URL"
        type="url"
        placeholder="https://…"
        description="Optional. Your logo in the app, on sign-in, and anywhere else we show your brand. Use a normal web link (https)."
      />
      {logoPreview ? (
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <Image
            src={logoPreview}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="size-12 shrink-0 rounded-md border bg-muted object-contain p-1"
          />
          <p className="text-xs text-muted-foreground">Logo preview</p>
        </div>
      ) : null}
    </FieldGroup>
  )
}
