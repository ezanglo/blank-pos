"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { SelectFormField, TextFormField } from "@/components/form"
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
import { updateStoreAndLocationSettings } from "@/lib/actions/organization"
import { checkSetupLocationSlugAvailable } from "@/lib/actions/setup-slugs"
import { businessLocationToStoreSettingsFields } from "@/lib/business-location"
import type { BusinessLocation } from "@/lib/db/schema-app"
import { type StoreSettingsFormValues, storeSettingsSchema } from "@/lib/schemas/app-forms"
import { normalizeSetupWebSlug } from "@/lib/setup-slug-normalize"

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

export function StoreSettingsForm({
  businessSlug,
  locationSlug,
  initialStoreName,
  initialLocation,
}: {
  businessSlug: string
  locationSlug: string
  initialStoreName: string
  initialLocation: BusinessLocation | null
}) {
  const router = useRouter()
  const locFields = businessLocationToStoreSettingsFields(initialLocation)
  const form = useForm<StoreSettingsFormValues>({
    resolver: standardSchemaResolver(storeSettingsSchema),
    defaultValues: {
      storeName: initialStoreName,
      ...locFields,
    },
  })

  const slugWatch = form.watch("locationSlug")
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityHint>("idle")

  useEffect(() => {
    if (!initialLocation?.id) return
    const raw = slugWatch ?? ""
    if (!raw.trim()) {
      setSlugAvailability("idle")
      return
    }
    const normalized = normalizeSetupWebSlug(raw)
    if (!normalized) {
      setSlugAvailability("invalid")
      return
    }
    if (normalized === initialLocation.slug) {
      setSlugAvailability("available")
      return
    }
    setSlugAvailability("checking")
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const latest = form.getValues("locationSlug") ?? ""
      const latestN = normalizeSetupWebSlug(latest)
      if (!latestN) {
        if (!cancelled) setSlugAvailability("invalid")
        return
      }
      if (latestN === initialLocation.slug) {
        if (!cancelled) setSlugAvailability("available")
        return
      }
      const res = await checkSetupLocationSlugAvailable(businessSlug, latest, initialLocation.id)
      if (cancelled) return
      if (res.status === "forbidden") {
        setSlugAvailability("forbidden")
        return
      }
      setSlugAvailability(res.status)
    }, SLUG_AVAILABILITY_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slugWatch, businessSlug, initialLocation, form])

  const slugSubmitBlocked =
    slugAvailability === "taken" ||
    slugAvailability === "invalid" ||
    slugAvailability === "forbidden" ||
    slugAvailability === "checking"

  async function onSubmit(values: StoreSettingsFormValues) {
    try {
      const result = await updateStoreAndLocationSettings(businessSlug, locationSlug, {
        storeName: values.storeName,
        locationName: values.locationName,
        desiredBranchSlug: values.locationSlug,
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
      if (result.locationSlug !== locationSlug) {
        router.replace(`/${businessSlug}/l/${result.locationSlug}/settings/store`)
      } else {
        router.refresh()
      }
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
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Store name, this branch’s display name and URL link, address on file, and currency for this location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="storeName" label="Store name" />
            <TextFormField control={form.control} name="locationName" label="Location name" />
            <TextFormField
              control={form.control}
              name="locationSlug"
              label="Location link"
              description="URL segment: /…/l/[link]/dashboard, POS, … — lowercase letters, numbers, hyphens."
            />
            {slugAvailability === "checking" ? (
              <p className="text-muted-foreground text-xs">Checking link availability…</p>
            ) : null}
            {slugAvailability === "available" ? (
              <p className="text-xs text-green-700 dark:text-green-400">This link can be used.</p>
            ) : null}
            {slugAvailability === "taken" ? (
              <p className="text-destructive text-xs">Another branch already uses this link.</p>
            ) : null}
            {slugAvailability === "invalid" ? (
              <p className="text-destructive text-xs">
                Use lowercase letters, numbers, and hyphens only (min 2 characters).
              </p>
            ) : null}
            {slugAvailability === "forbidden" ? (
              <p className="text-destructive text-xs">You cannot use this link here.</p>
            ) : null}
            <SelectFormField
              control={form.control}
              name="defaultCurrency"
              label="Currency"
              options={[
                { value: "PHP", label: "PHP" },
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
                { value: "GBP", label: "GBP" },
              ]}
            />
            <TextFormField control={form.control} name="addressLine1" label="Address line 1" />
            <TextFormField control={form.control} name="addressLine2" label="Address line 2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextFormField control={form.control} name="city" label="City" />
              <TextFormField control={form.control} name="region" label="State / region" />
            </div>
            <TextFormField control={form.control} name="postalCode" label="Postal code" />
            <TextFormField control={form.control} name="phone" label="Phone" />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={form.formState.isSubmitting || slugSubmitBlocked}>
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
