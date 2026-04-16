"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { bootstrapCreateOwner } from "@/lib/actions/setup"
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
  SelectFormField,
  TextFormField,
} from "@/components/form"
import { authClient } from "@/lib/auth-client"
import { type OrgMetadata } from "@/lib/org-metadata"
import {
  type SetupBrandingFormValues,
  type SetupOwnerFormValues,
  type SetupStoreFormValues,
  setupBrandingSchema,
  setupOwnerSchema,
  setupStoreSchema,
} from "@/lib/schemas/app-forms"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function SetupOwnerStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const form = useForm<SetupOwnerFormValues>({
    resolver: standardSchemaResolver(setupOwnerSchema),
    defaultValues: { username: "", password: "", ownerName: "" },
  })

  async function onSubmit(values: SetupOwnerFormValues) {
    try {
      await bootstrapCreateOwner({
        username: values.username,
        password: values.password,
        name: values.ownerName,
      })
      const signIn = await authClient.signIn.username({
        username: values.username,
        password: values.password,
      })
      if (signIn.error) {
        form.setError("root", { message: signIn.error.message ?? "Sign-in failed" })
        return
      }
      onDone()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner account</CardTitle>
        <CardDescription>Create the first admin username and password.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField
              control={form.control}
              name="username"
              label="Username"
              autoComplete="username"
            />
            <TextFormField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
            />
            <TextFormField
              control={form.control}
              name="ownerName"
              label="Display name"
              autoComplete="name"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Working…" : "Create owner & sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function SetupStoreStep({
  onBack,
  onDone,
}: {
  onBack: () => void
  onDone: (slug: string, displayName: string) => void
}) {
  const form = useForm<SetupStoreFormValues>({
    resolver: standardSchemaResolver(setupStoreSchema),
    defaultValues: {
      storeName: "",
      slug: "",
      defaultCurrency: "USD",
      addressLine1: "",
      phone: "",
    },
  })

  const slugWatch = form.watch("slug")

  async function onSubmit(values: SetupStoreFormValues) {
    try {
      const meta: OrgMetadata = {
        defaultCurrency: values.defaultCurrency,
        addressLine1: values.addressLine1 || undefined,
        phone: values.phone || undefined,
      }
      const res = await authClient.organization.create({
        name: values.storeName,
        slug: values.slug,
        metadata: meta as Record<string, unknown>,
        keepCurrentActiveOrganization: true,
      })
      if (res.error) {
        form.setError("root", { message: res.error.message ?? "Could not create organization" })
        return
      }
      onDone(values.slug, values.storeName)
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your store</CardTitle>
        <CardDescription>Organization name, URL slug, and site details.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="storeName" label="Store name" />
            <TextFormField
              control={form.control}
              name="slug"
              label="URL slug"
              placeholder="e.g. main-street-cafe"
              autoComplete="off"
              description={`Your POS will live at /${slugWatch?.trim().toLowerCase() || "slug"}/…`}
            />
            <SelectFormField
              control={form.control}
              name="defaultCurrency"
              label="Default currency"
              options={[
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
                { value: "GBP", label: "GBP" },
                { value: "PHP", label: "PHP" },
              ]}
            />
            <TextFormField
              control={form.control}
              name="addressLine1"
              label="Street address"
              description="Optional; shown on receipts later."
            />
            <TextFormField control={form.control} name="phone" label="Phone" />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Working…" : "Create store"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function SetupBrandingStep({
  orgSlug,
  defaultDisplayName,
  onBack,
}: {
  orgSlug: string
  defaultDisplayName: string
  onBack: () => void
}) {
  const router = useRouter()
  const form = useForm<SetupBrandingFormValues>({
    resolver: standardSchemaResolver(setupBrandingSchema),
    defaultValues: {
      displayName: defaultDisplayName,
      tagline: "",
      primaryColor: "#171717",
      accentColor: "#404040",
    },
  })

  const primary = form.watch("primaryColor")
  const accent = form.watch("accentColor")

  async function onSubmit(values: SetupBrandingFormValues) {
    try {
      await updateBranding(orgSlug, {
        displayName: values.displayName?.trim() || null,
        tagline: values.tagline?.trim() || null,
        primaryColor: values.primaryColor,
        accentColor: values.accentColor,
      })
      router.replace(`/${orgSlug}/dashboard`)
      router.refresh()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Colors and receipt-facing name for your shell.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="displayName" label="Receipt display name" />
            <TextFormField control={form.control} name="tagline" label="Tagline (optional)" />
            <div className="grid grid-cols-2 gap-3">
              <ColorFormField control={form.control} name="primaryColor" label="Primary" />
              <ColorFormField control={form.control} name="accentColor" label="Accent" />
            </div>
            <div
              className="rounded-xl border p-4 text-sm"
              style={
                {
                  borderColor: accent,
                  background: `linear-gradient(135deg, ${primary}22, transparent)`,
                } as React.CSSProperties
              }
            >
              Preview: buttons and chrome will use these colors.
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Finish & go to dashboard"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
