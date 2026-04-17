"use client"

import { type Control, type UseFormSetValue } from "react-hook-form"

import { BrandingLogoUpload } from "@/components/branding/branding-logo-upload"
import { TextFormField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { type SetupBrandingFormValues } from "@/lib/schemas/app-forms"

export function SetupBrandingFields({
  control,
  setValue,
}: {
  control: Control<SetupBrandingFormValues>
  setValue: UseFormSetValue<SetupBrandingFormValues>
}) {
  return (
    <FieldGroup>
      <TextFormField
        control={control}
        name="displayName"
        label="Store name"
        description="How your store shows up in the app and on the sign-in page. The next step is only for this shop’s name and address—they can be different."
      />
      <BrandingLogoUpload control={control} setValue={setValue} />
      <TextFormField
        control={control}
        name="logoImageUrl"
        label="Logo image URL (optional)"
        type="text"
        placeholder="https://… or /uploads/… after upload"
        description="Upload a file above, or paste a public https link."
      />
    </FieldGroup>
  )
}
