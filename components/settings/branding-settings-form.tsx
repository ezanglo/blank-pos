"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { BrandingSettingsFields } from "@/components/branding/branding-settings-fields"
import { updateStoreBranding } from "@/lib/actions/branding"
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

export function BrandingSettingsForm({ initial }: { initial: BrandingSettingsFormValues }) {
  const router = useRouter()
  const form = useForm<BrandingSettingsFormValues>({
    resolver: standardSchemaResolver(brandingSettingsSchema),
    defaultValues: initial,
  })

  async function onSubmit(values: BrandingSettingsFormValues) {
    try {
      await updateStoreBranding({
        displayName: values.displayName?.trim() || null,
        tagline: values.tagline?.trim() || null,
        receiptHeaderText: values.receiptHeaderText?.trim() || null,
        receiptFooterText: values.receiptFooterText?.trim() || null,
        legalName: values.legalName?.trim() || null,
        taxIdentifier: values.taxIdentifier?.trim() || null,
        websiteUrl: values.websiteUrl?.trim() || null,
        menuUrl: values.menuUrl?.trim() || null,
        contactEmail: values.contactEmail?.trim() || null,
        publicPhone: values.publicPhone?.trim() || null,
        instagramUrl: values.instagramUrl?.trim() || null,
        facebookUrl: values.facebookUrl?.trim() || null,
        operatingHoursText: values.operatingHoursText?.trim() || null,
        primaryColor: values.primaryColor?.trim() || null,
        accentColor: values.accentColor?.trim() || null,
        loginBackgroundImageUrl: values.loginBackgroundImageUrl?.trim() || null,
        logoImageUrl: values.logoImageUrl?.trim() || null,
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
            Your store’s shared look and message: name, logo, colors, sign-in page, how to reach you,
            hours, and optional lines for printed tickets—all shared across shops. For one shop’s name
            or address, use Location in that shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <BrandingSettingsFields control={form.control} />
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
