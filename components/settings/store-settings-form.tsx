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
import type { OrgMetadata } from "@/lib/org-metadata"
import { type StoreSettingsFormValues, storeSettingsSchema } from "@/lib/schemas/app-forms"

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
  initialMeta,
}: {
  orgSlug: string
  initialName: string
  initialMeta: OrgMetadata
}) {
  const router = useRouter()
  const form = useForm<StoreSettingsFormValues>({
    resolver: standardSchemaResolver(storeSettingsSchema),
    defaultValues: {
      name: initialName,
      defaultCurrency: (initialMeta.defaultCurrency as StoreSettingsFormValues["defaultCurrency"]) ?? "USD",
      addressLine1: initialMeta.addressLine1 ?? "",
      phone: initialMeta.phone ?? "",
    },
  })

  async function onSubmit(values: StoreSettingsFormValues) {
    try {
      const metadata: OrgMetadata = {
        defaultCurrency: values.defaultCurrency,
        addressLine1: values.addressLine1 || undefined,
        phone: values.phone || undefined,
      }
      await updateOrganizationStore(orgSlug, { name: values.name, metadata })
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
        <CardTitle>Store</CardTitle>
        <CardDescription>Organization name and site details.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField control={form.control} name="name" label="Store name" />
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
            <TextFormField control={form.control} name="addressLine1" label="Street address" />
            <TextFormField control={form.control} name="phone" label="Phone" />
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
