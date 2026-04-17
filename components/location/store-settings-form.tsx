"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { updateStoreAndLocationSettings } from "@/lib/actions/organization"
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
import { type StoreSettingsFormValues, storeSettingsSchema } from "@/lib/schemas/app-forms"
import { businessLocationToStoreSettingsFields } from "@/lib/business-location"
import type { BusinessLocation } from "@/lib/db/schema-app"

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

  async function onSubmit(values: StoreSettingsFormValues) {
    try {
      await updateStoreAndLocationSettings(businessSlug, locationSlug, {
        storeName: values.storeName,
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
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Store name, this branch’s display name, address on file, and currency for this
            location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="storeName" label="Store name" />
            <TextFormField control={form.control} name="locationName" label="Location name" />
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
