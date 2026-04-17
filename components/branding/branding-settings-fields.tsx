"use client"

import { type Control, type UseFormSetValue } from "react-hook-form"

import { BrandingLogoUpload } from "@/components/branding/branding-logo-upload"
import { BrandColorFormField, TextareaFormField, TextFormField } from "@/components/form"
import { FieldGroup } from "@/components/ui/field"
import { type BrandingSettingsFormValues } from "@/lib/schemas/app-forms"

export function BrandingSettingsFields({
  control,
  setValue,
}: {
  control: Control<BrandingSettingsFormValues>
  setValue: UseFormSetValue<BrandingSettingsFormValues>
}) {
  return (
    <FieldGroup>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Store brand
      </p>
      <TextFormField
        control={control}
        name="displayName"
        label="Display name"
        description="How your business shows up in the app and to customers. Same for every shop. To change one shop’s name in the app, use Location in that shop."
      />
      <TextFormField control={control} name="tagline" label="Tagline" />
      <TextFormField
        control={control}
        name="legalName"
        label="Legal business name"
        description="Optional. When your legal name should show on paperwork or printed tickets."
      />
      <TextFormField
        control={control}
        name="taxIdentifier"
        label="Tax / VAT ID"
        description="Optional. When you need a tax or VAT number on printed tickets or forms."
      />
      <BrandingLogoUpload control={control} setValue={setValue} />
      <TextFormField
        control={control}
        name="logoImageUrl"
        label="Logo image URL (optional)"
        type="text"
        placeholder="https://… or /uploads/… after upload"
        description="Upload a file above, or paste a public https link. Local dev uploads use paths under /uploads/."
      />
      <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Printed tickets (optional)
      </p>
      <TextareaFormField
        control={control}
        name="receiptHeaderText"
        label="Extra text at the top"
        description="Optional. Only for printed tickets, if you use them."
        className="min-h-[72px]"
      />
      <TextareaFormField
        control={control}
        name="receiptFooterText"
        label="Extra text at the bottom"
        description="Optional. Only for printed tickets, if you use them."
        className="min-h-[72px]"
      />

      <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Website and contact
      </p>
      <TextFormField
        control={control}
        name="websiteUrl"
        label="Website URL"
        type="url"
        placeholder="https://…"
        description="Optional. Your main website or order page."
      />
      <TextFormField
        control={control}
        name="menuUrl"
        label="Menu URL"
        type="url"
        placeholder="https://…"
        description="Optional. Link to your menu online."
      />
      <TextFormField
        control={control}
        name="contactEmail"
        label="Public contact email"
        type="email"
      />
      <TextFormField
        control={control}
        name="publicPhone"
        label="Public phone"
        description="Optional. Use this if it is not the same as the phone you saved under Location for a shop."
      />

      <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Social and hours
      </p>
      <TextFormField
        control={control}
        name="instagramUrl"
        label="Instagram URL"
        type="url"
        placeholder="https://…"
      />
      <TextFormField
        control={control}
        name="facebookUrl"
        label="Facebook URL"
        type="url"
        placeholder="https://…"
      />
      <TextareaFormField
        control={control}
        name="operatingHoursText"
        label="Opening hours"
        description="Optional. Hours or short notes customers might see online or on printed tickets."
        className="min-h-[72px]"
      />

      <p className="mt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Colors
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <BrandColorFormField
          control={control}
          name="primaryColor"
          label="Primary color"
          description="Click the color square for a compact palette, or type a token (e.g. emerald-600) or hex. Used for org shell CSS variables."
        />
        <BrandColorFormField
          control={control}
          name="accentColor"
          label="Accent color"
          description="Click the color square for the palette, or type a token / hex."
        />
      </div>
    </FieldGroup>
  )
}
