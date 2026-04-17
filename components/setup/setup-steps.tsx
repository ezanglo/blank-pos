"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"

import {
  seedInitialStoreBrandingAfterOrgCreate,
  setupPhaseSaveStoreBranding,
} from "@/lib/actions/branding"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { createFirstLocationAfterOrgCreate } from "@/lib/actions/organization"
import {
  checkSetupLocationSlugAvailable,
  checkSetupStoreSlugAvailable,
} from "@/lib/actions/setup-slugs"
import { bootstrapCreateOwner } from "@/lib/actions/setup"
import { normalizeSetupWebSlug } from "@/lib/setup-slug-normalize"
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
  type SetupFirstLocationFormValues,
  type SetupOwnerFormValues,
  type SetupStoreSiteFormValues,
  setupBrandingSchema,
  setupFirstLocationSchema,
  setupOwnerSchema,
  setupStoreSiteSchema,
} from "@/lib/schemas/app-forms"

import { slugifyWebSegmentFromName } from "@/lib/slugify-web-segment"

import { SetupBrandingFields } from "./setup-branding-fields"

const SLUG_AVAILABILITY_DEBOUNCE_MS = 1400

type SlugAvailabilityHint = "idle" | "checking" | "available" | "taken" | "invalid" | "forbidden"

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

export function SetupStoreStep({
  resumeStoreSlug,
  resumeStoreName,
  onBack,
  onDone,
}: {
  /** When set, the store already exists (user returned from the location step). */
  resumeStoreSlug?: string | null
  /** Organization display name (for resume / branding defaults); falls back to slug. */
  resumeStoreName?: string | null
  onBack: () => void
  onDone: (ctx: { storeSlug: string; storeName: string }) => void
}) {
  const router = useRouter()
  const form = useForm<SetupStoreSiteFormValues>({
    resolver: standardSchemaResolver(setupStoreSiteSchema),
    defaultValues: { storeName: "", slug: "" },
  })

  const storeNameWatch = form.watch("storeName")
  const slugWatch = form.watch("slug")
  const lastAutoStoreSlug = useRef<string | null>(null)
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityHint>("idle")

  const suggestedStoreSlug = useMemo(() => {
    const n = storeNameWatch?.trim()
    if (!n) return ""
    return slugifyWebSegmentFromName(n)
  }, [storeNameWatch])

  useEffect(() => {
    const name = storeNameWatch?.trim()
    if (!name) return
    const suggested = slugifyWebSegmentFromName(name)
    const current = (form.getValues("slug") ?? "").trim()
    if (current === "" || current === lastAutoStoreSlug.current) {
      form.setValue("slug", suggested, { shouldValidate: true })
      lastAutoStoreSlug.current = suggested
    }
  }, [storeNameWatch, form])

  useEffect(() => {
    const raw = slugWatch ?? ""
    if (!raw.trim()) {
      setSlugAvailability("idle")
      return
    }
    if (!normalizeSetupWebSlug(raw)) {
      setSlugAvailability("invalid")
      return
    }
    setSlugAvailability("checking")
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const latest = form.getValues("slug") ?? ""
      if (!normalizeSetupWebSlug(latest)) {
        if (!cancelled) setSlugAvailability("invalid")
        return
      }
      const res = await checkSetupStoreSlugAvailable(latest)
      if (cancelled) return
      setSlugAvailability(res.status)
    }, SLUG_AVAILABILITY_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slugWatch, form])

  const slugSubmitBlocked =
    slugAvailability === "taken" ||
    slugAvailability === "invalid" ||
    slugAvailability === "checking"

  if (resumeStoreSlug) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your store</CardTitle>
          <CardDescription>
            <span className="text-foreground font-medium">/{resumeStoreSlug}</span> is already
            created. Continue to your first location, or go back to the previous step.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={() =>
              onDone({
                storeSlug: resumeStoreSlug,
                storeName: resumeStoreName?.trim() || resumeStoreSlug,
              })
            }
          >
            Continue to first location
          </Button>
        </CardFooter>
      </Card>
    )
  }

  async function onSubmit(values: SetupStoreSiteFormValues) {
    try {
      const slug = values.slug
      const res = await authClient.organization.create({
        name: values.storeName.trim(),
        slug,
        metadata: {} as Record<string, unknown>,
        keepCurrentActiveOrganization: true,
      })
      if (res.error) {
        form.setError("root", {
          message: res.error.message ?? "Could not create this store",
        })
        return
      }
      await seedInitialStoreBrandingAfterOrgCreate(slug)
      onDone({ storeSlug: slug, storeName: values.storeName.trim() })
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
          <CardTitle>Your store</CardTitle>
          <CardDescription>
            Create the store (team and branding scope). We suggest a web link from the store name;
            you can edit it. Availability is checked after you pause typing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="storeName" label="Store name" />
            <TextFormField
              control={form.control}
              name="slug"
              label="Store web link"
              placeholder="e.g. acme-retail"
              autoComplete="off"
              description={
                suggestedStoreSlug
                  ? `Suggested from name: /${suggestedStoreSlug} — you can use another link if you prefer.`
                  : "Lowercase letters, numbers, and hyphens. At least 2 characters."
              }
            />
            {slugAvailability === "checking" ? (
              <p className="text-muted-foreground text-xs">Checking if this store link is free…</p>
            ) : null}
            {slugAvailability === "available" ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-500">This store link is available.</p>
            ) : null}
            {slugAvailability === "taken" ? (
              <p className="text-destructive text-xs">That store link is already taken. Try a different one.</p>
            ) : null}
            {slugAvailability === "invalid" ? (
              <p className="text-destructive text-xs">
                Use 2+ characters: lowercase letters, numbers, and hyphens only (no spaces).
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || slugSubmitBlocked}>
            {form.formState.isSubmitting ? "Working…" : "Save & continue"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export function SetupFirstLocationStep({
  storeSlug,
  onBack,
  onDone,
}: {
  storeSlug: string
  onBack: () => void
  onDone: (ctx: { locationSlug: string }) => void
}) {
  const router = useRouter()
  const form = useForm<SetupFirstLocationFormValues>({
    resolver: standardSchemaResolver(setupFirstLocationSchema),
    defaultValues: {
      locationName: "",
      locationSlug: "",
      defaultCurrency: "USD",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
    },
  })

  const locationNameWatch = form.watch("locationName")
  const locationSlugWatch = form.watch("locationSlug")
  const lastAutoLocationSlug = useRef<string | null>(null)
  const [locationSlugAvailability, setLocationSlugAvailability] =
    useState<SlugAvailabilityHint>("idle")

  const suggestedLocationSlug = useMemo(() => {
    const n = locationNameWatch?.trim()
    if (!n) return ""
    return slugifyWebSegmentFromName(n)
  }, [locationNameWatch])

  useEffect(() => {
    const name = locationNameWatch?.trim()
    if (!name) return
    const suggested = slugifyWebSegmentFromName(name)
    const current = (form.getValues("locationSlug") ?? "").trim()
    if (current === "" || current === lastAutoLocationSlug.current) {
      form.setValue("locationSlug", suggested, { shouldValidate: true })
      lastAutoLocationSlug.current = suggested
    }
  }, [locationNameWatch, form])

  useEffect(() => {
    const raw = locationSlugWatch ?? ""
    if (!raw.trim()) {
      setLocationSlugAvailability("idle")
      return
    }
    if (!normalizeSetupWebSlug(raw)) {
      setLocationSlugAvailability("invalid")
      return
    }
    setLocationSlugAvailability("checking")
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const latest = form.getValues("locationSlug") ?? ""
      if (!normalizeSetupWebSlug(latest)) {
        if (!cancelled) setLocationSlugAvailability("invalid")
        return
      }
      const res = await checkSetupLocationSlugAvailable(storeSlug, latest)
      if (cancelled) return
      if (res.status === "forbidden") {
        setLocationSlugAvailability("forbidden")
        return
      }
      setLocationSlugAvailability(res.status)
    }, SLUG_AVAILABILITY_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [locationSlugWatch, form, storeSlug])

  const locationSlugSubmitBlocked =
    locationSlugAvailability === "taken" ||
    locationSlugAvailability === "invalid" ||
    locationSlugAvailability === "forbidden" ||
    locationSlugAvailability === "checking"

  async function onSubmit(values: SetupFirstLocationFormValues) {
    try {
      const locationSlug = values.locationSlug
      await createFirstLocationAfterOrgCreate(storeSlug, {
        locationSlug,
        locationName: values.locationName,
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
      onDone({ locationSlug })
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
          <CardTitle>First location</CardTitle>
          <CardDescription>
            Add your first branch: name, currency, and optional address. We suggest a location link
            from the name; you can edit it. Availability is checked after you pause typing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="locationName" label="Location name" />
            <TextFormField
              control={form.control}
              name="locationSlug"
              label="Location web link"
              placeholder="e.g. main"
              autoComplete="off"
              description={
                suggestedLocationSlug
                  ? `Suggested from name: /${storeSlug}/l/${suggestedLocationSlug} — you can change the last segment.`
                  : `Opens under your store at /${storeSlug}/l/…`
              }
            />
            {locationSlugAvailability === "checking" ? (
              <p className="text-muted-foreground text-xs">Checking if this location link is free…</p>
            ) : null}
            {locationSlugAvailability === "available" ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                This location link is available.
              </p>
            ) : null}
            {locationSlugAvailability === "taken" ? (
              <p className="text-destructive text-xs">
                That location link is already used in this store. Try another.
              </p>
            ) : null}
            {locationSlugAvailability === "invalid" ? (
              <p className="text-destructive text-xs">
                Use 2+ characters: lowercase letters, numbers, and hyphens only (no spaces).
              </p>
            ) : null}
            {locationSlugAvailability === "forbidden" ? (
              <p className="text-destructive text-xs">You don&apos;t have access to this store.</p>
            ) : null}
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
          <Button type="submit" disabled={form.formState.isSubmitting || locationSlugSubmitBlocked}>
            {form.formState.isSubmitting ? "Working…" : "Save & continue"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export function SetupStoreBrandingStep({
  storeSlug,
  locationSlug,
  defaultDisplayName,
  onBack,
  onDone,
}: {
  storeSlug: string
  locationSlug: string
  /** Prefer store display name (matches seeded `store_branding.display_name`). */
  defaultDisplayName: string
  onBack: () => void
  onDone: () => void
}) {
  const router = useRouter()
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
      await setupPhaseSaveStoreBranding(storeSlug, {
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
      })
      router.replace(`/${storeSlug}/l/${locationSlug}/dashboard`)
      router.refresh()
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
            How your store brand looks and reads in the app for all your branches—starting with name
            and logo. You can add colors, contact info, and more later in Settings under Branding.
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
