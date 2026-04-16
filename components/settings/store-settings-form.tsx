"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { updateOrganizationStore } from "@/lib/actions/organization"
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
import { storeLocationToStoreSettingsFields } from "@/lib/store-location"
import type { StoreLocation } from "@/lib/db/schema-app"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function StoreSettingsForm({
  orgSlug,
  initialName,
  initialLocation,
}: {
  orgSlug: string
  initialName: string
  initialLocation: StoreLocation | null
}) {
  const router = useRouter()
  const locFields = storeLocationToStoreSettingsFields(initialLocation)
  const form = useForm<StoreSettingsFormValues>({
    resolver: standardSchemaResolver(storeSettingsSchema),
    defaultValues: {
      name: initialName,
      ...locFields,
    },
  })

  async function onSubmit(values: StoreSettingsFormValues) {
    try {
      await updateOrganizationStore(orgSlug, {
        name: values.name,
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
            The name staff see for this shop, the address you keep on file, and the money type you
            use here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="name" label="Location name" />
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
