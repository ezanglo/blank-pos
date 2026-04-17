"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { BrandingSettingsFields } from "@/components/branding/branding-settings-fields"
import { updateStoreBranding } from "@/lib/actions/branding"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type BrandingSettingsFormValues,
  brandingSettingsSchema,
} from "@/lib/schemas/app-forms"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function BrandingSettingsForm({
  storeSlug,
  initial,
}: {
  storeSlug: string
  initial: BrandingSettingsFormValues
}) {
  const router = useRouter()
  const form = useForm<BrandingSettingsFormValues>({
    resolver: standardSchemaResolver(brandingSettingsSchema),
    defaultValues: initial,
  })

  async function onSubmit() {
    try {
      await flushPendingImageUploads((_id, url) => {
        form.setValue("logoImageUrl", url, { shouldValidate: true, shouldDirty: true })
      })
      const next = form.getValues()
      await updateStoreBranding(storeSlug, {
        displayName: next.displayName?.trim() || null,
        tagline: next.tagline?.trim() || null,
        receiptHeaderText: next.receiptHeaderText?.trim() || null,
        receiptFooterText: next.receiptFooterText?.trim() || null,
        legalName: next.legalName?.trim() || null,
        taxIdentifier: next.taxIdentifier?.trim() || null,
        websiteUrl: next.websiteUrl?.trim() || null,
        menuUrl: next.menuUrl?.trim() || null,
        contactEmail: next.contactEmail?.trim() || null,
        publicPhone: next.publicPhone?.trim() || null,
        instagramUrl: next.instagramUrl?.trim() || null,
        facebookUrl: next.facebookUrl?.trim() || null,
        operatingHoursText: next.operatingHoursText?.trim() || null,
        primaryColor: next.primaryColor?.trim() || null,
        accentColor: next.accentColor?.trim() || null,
        logoImageUrl: next.logoImageUrl?.trim() || null,
      })
      router.refresh()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Could not save",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            This store’s look and message: name, logo, colors, contact lines, hours, and optional
            receipt copy. Branch address and currency live under Location for each branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <BrandingSettingsFields control={form.control} setValue={form.setValue} />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
