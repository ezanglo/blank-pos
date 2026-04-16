"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { updateBranding } from "@/lib/actions/branding"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import {
  ColorFormField,
  TextareaFormField,
  TextFormField,
} from "@/components/form"
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
  orgSlug,
  initial,
}: {
  orgSlug: string
  initial: {
    displayName: string
    tagline: string
    primaryColor: string
    accentColor: string
    receiptHeaderText: string
    receiptFooterText: string
    loginBackgroundImageUrl: string
    logoImageUrl: string
  }
}) {
  const router = useRouter()
  const form = useForm<BrandingSettingsFormValues>({
    resolver: standardSchemaResolver(brandingSettingsSchema),
    defaultValues: {
      displayName: initial.displayName,
      tagline: initial.tagline,
      primaryColor: initial.primaryColor,
      accentColor: initial.accentColor,
      receiptHeaderText: initial.receiptHeaderText,
      receiptFooterText: initial.receiptFooterText,
      loginBackgroundImageUrl: initial.loginBackgroundImageUrl,
      logoImageUrl: initial.logoImageUrl,
    },
  })

  const primary = form.watch("primaryColor")
  const accent = form.watch("accentColor")
  const logoPreview = form.watch("logoImageUrl")?.trim() || null

  async function onSubmit(values: BrandingSettingsFormValues) {
    try {
      await updateBranding(orgSlug, {
        displayName: values.displayName?.trim() || null,
        tagline: values.tagline?.trim() || null,
        primaryColor: values.primaryColor,
        accentColor: values.accentColor,
        receiptHeaderText: values.receiptHeaderText?.trim() || null,
        receiptFooterText: values.receiptFooterText?.trim() || null,
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
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Receipt-facing name, colors, copy, optional logo URL, and optional sign-in page image.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="displayName" label="Receipt display name" />
            <TextFormField control={form.control} name="tagline" label="Tagline" />
            <TextFormField
              control={form.control}
              name="logoImageUrl"
              label="Logo image URL"
              type="url"
              placeholder="https://…"
              description="Optional. Shown on login and in the app header. Use https (or http in dev)."
            />
            {logoPreview ? (
              <div className="flex items-center gap-3 rounded-xl border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin URL from form */}
                <img
                  src={logoPreview}
                  alt=""
                  className="size-12 shrink-0 rounded-md border bg-muted object-contain p-1"
                />
                <p className="text-muted-foreground text-xs">Logo preview</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <ColorFormField control={form.control} name="primaryColor" label="Primary" />
              <ColorFormField control={form.control} name="accentColor" label="Accent" />
            </div>
            <TextareaFormField
              control={form.control}
              name="receiptHeaderText"
              label="Receipt header"
              className="min-h-[72px]"
            />
            <TextareaFormField
              control={form.control}
              name="receiptFooterText"
              label="Receipt footer"
              className="min-h-[72px]"
            />
            <TextFormField
              control={form.control}
              name="loginBackgroundImageUrl"
              label="Sign-in page image URL"
              type="url"
              placeholder="https://…"
              description="Optional. Shown on /login when this store is selected (see docs). Must be https (or http in dev)."
            />
            <div
              className="rounded-xl border p-4 text-sm"
              style={
                {
                  borderColor: accent,
                  background: `linear-gradient(135deg, ${primary}22, transparent)`,
                } as React.CSSProperties
              }
            >
              Preview: shell uses these colors after refresh.
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
