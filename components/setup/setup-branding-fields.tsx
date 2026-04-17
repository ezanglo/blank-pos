"use client"

import type { Control, FieldValues, Path, UseFormSetValue } from "react-hook-form"

import { BrandingLogoUpload } from "@/components/branding/branding-logo-upload"
import { TextFormField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"

export function SetupBrandingFields<T extends FieldValues = FieldValues>({
  control,
  setValue,
  hideDisplayName = false,
}: {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** When true, omit display name (e.g. store step already captured the business name). */
  hideDisplayName?: boolean
}) {
  return (
    <FieldGroup>
      {!hideDisplayName ? (
        <TextFormField
          control={control}
          name={"displayName" as Path<T>}
          label="Store name"
          description="How your store shows up in the app and on the sign-in page. The next step is only for this shop’s name and address—they can be different."
        />
      ) : null}
      <BrandingLogoUpload control={control} setValue={setValue} />
      <TextFormField
        control={control}
        name={"logoImageUrl" as Path<T>}
        label="Logo image URL (optional)"
        type="text"
        placeholder="https://… or /uploads/… after upload"
        description="Upload a file above, or paste a public https link."
      />
      <TextFormField
        control={control}
        name={"businessCategory" as Path<T>}
        label="Business category (optional)"
        placeholder="e.g. retail, food & beverage, services"
      />
      <TextFormField
        control={control}
        name={"teamScaleBand" as Path<T>}
        label="Team size (optional)"
        placeholder="e.g. solo, small team, multi-location"
      />
      <TextFormField
        control={control}
        name={"expectedGoLive" as Path<T>}
        label="Target go-live (optional)"
        placeholder="e.g. 2026-06-01 or “this summer”"
      />
    </FieldGroup>
  )
}
