"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { setupPhaseSaveStoreBranding } from "@/lib/actions/branding"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { updateOrganizationStore } from "@/lib/actions/organization"
import { bootstrapCreateOwner } from "@/lib/actions/setup"
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
import { SelectFormField, TextFormField } from "@/components/form"
import { authClient } from "@/lib/auth-client"
import {
  type SetupBrandingFormValues,
  type SetupOrgLocationFormValues,
  type SetupOwnerFormValues,
  setupBrandingSchema,
  setupOrgLocationSchema,
  setupOwnerSchema,
} from "@/lib/schemas/app-forms"

import { SetupBrandingFields } from "./setup-branding-fields"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function SetupOwnerStep({
  onBack,
  onDone,
}: {
  onBack: () => void
  onDone: (ownerDisplayName: string) => void
}) {
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
      onDone(values.ownerName)
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Owner account</CardTitle>
          <CardDescription>Create the first admin username and password.</CardDescription>
        </CardHeader>
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
      </Card>
    </form>
  )
}

export function SetupOrganizationLocationStep({
  onBack,
}: {
  onBack: () => void
}) {
  const router = useRouter()
  const form = useForm<SetupOrgLocationFormValues>({
    resolver: standardSchemaResolver(setupOrgLocationSchema),
    defaultValues: {
      storeName: "",
      slug: "",
      defaultCurrency: "USD",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
    },
  })

  const slugWatch = form.watch("slug")

  async function onSubmit(values: SetupOrgLocationFormValues) {
    try {
      const res = await authClient.organization.create({
        name: values.storeName,
        slug: values.slug,
        metadata: {} as Record<string, unknown>,
        keepCurrentActiveOrganization: true,
      })
      if (res.error) {
        form.setError("root", {
          message: res.error.message ?? "Could not create this location",
        })
        return
      }
      await updateOrganizationStore(values.slug, {
        name: values.storeName,
        location: {
          defaultCurrency: values.defaultCurrency,
          addressLine1: values.addressLine1 || undefined,
          addressLine2: values.addressLine2 || undefined,
          city: values.city || undefined,
          region: values.region || undefined,
          postalCode: values.postalCode || undefined,
          phone: values.phone || undefined,
        },
      })
      router.replace(`/${values.slug}/dashboard`)
      router.refresh()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Name this shop, pick the web link your team uses to sign in, then add currency and
            address. One shop is one location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="storeName" label="Location name" />
            <TextFormField
              control={form.control}
              name="slug"
              label="Web link name"
              placeholder="e.g. main-street-cafe"
              autoComplete="off"
              description={`Staff sign in at /${slugWatch?.trim().toLowerCase() || "your-link"}/ on this site.`}
            />
            <SelectFormField
              control={form.control}
              name="defaultCurrency"
              label="Currency"
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
              label="Address line 1"
              description="Optional. We may use this on receipts later."
            />
            <TextFormField control={form.control} name="addressLine2" label="Address line 2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextFormField control={form.control} name="city" label="City" />
              <TextFormField control={form.control} name="region" label="State / region" />
            </div>
            <TextFormField control={form.control} name="postalCode" label="Postal code" />
            <TextFormField control={form.control} name="phone" label="Phone" />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Working…" : "Save location & finish"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export function SetupStoreBrandingStep({
  defaultDisplayName,
  onBack,
  onDone,
}: {
  defaultDisplayName: string
  onBack: () => void
  onDone: () => void
}) {
  const form = useForm<SetupBrandingFormValues>({
    resolver: standardSchemaResolver(setupBrandingSchema),
    defaultValues: {
      displayName: defaultDisplayName,
      logoImageUrl: "",
    },
  })

  async function onSubmit() {
    try {
      await flushPendingImageUploads((_id, url) => {
        form.setValue("logoImageUrl", url, { shouldValidate: true, shouldDirty: true })
      })
      const next = form.getValues()
      await setupPhaseSaveStoreBranding({
        displayName: next.displayName.trim() || null,
        logoImageUrl: next.logoImageUrl?.trim() || null,
        tagline: null,
        receiptHeaderText: null,
        receiptFooterText: null,
        legalName: null,
        taxIdentifier: null,
        websiteUrl: null,
        menuUrl: null,
        contactEmail: null,
        publicPhone: null,
        instagramUrl: null,
        facebookUrl: null,
        operatingHoursText: null,
        primaryColor: null,
        accentColor: null,
        loginBackgroundImageUrl: null,
      })
      onDone()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            How your store brand looks and reads in the app for all your shops—starting with name and
            logo. This is not your shop address or staff web link; you add those next. You can add
            colors, contact info, and more later in Settings under Branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <SetupBrandingFields control={form.control} setValue={form.setValue} />
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save & continue"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
