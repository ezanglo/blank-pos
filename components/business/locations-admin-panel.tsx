"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AdminSettingsTable } from "@/components/admin/admin-settings-table"
import {
  createOrganizationLocation,
  deleteOrganizationLocation,
  updateOrganizationLocationBranch,
} from "@/lib/actions/locations"
import { SelectFormField, TextFormField } from "@/components/form"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import {
  type AdminAddLocationFormValues,
  adminAddLocationSchema,
  type AdminLocationBranchCoreFormValues,
  adminLocationBranchCoreSchema,
  setupLocationSchema,
  type SetupLocationFormValues,
} from "@/lib/schemas/app-forms"
import { slugifyWebSegmentFromName } from "@/lib/slugify-web-segment"
import { cn } from "@/lib/utils"

export type LocationAdminRow = {
  id: string
  slug: string
  name: string
  isDefault: boolean
  defaultCurrency: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  phone: string | null
}

function BranchAddressFields({
  control,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
}) {
  return (
    <>
      <TextFormField control={control} name="addressLine1" label="Address line 1" />
      <TextFormField control={control} name="addressLine2" label="Address line 2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextFormField control={control} name="city" label="City" />
        <TextFormField control={control} name="region" label="State / region" />
      </div>
      <TextFormField control={control} name="postalCode" label="Postal code" />
      <TextFormField control={control} name="phone" label="Phone" />
    </>
  )
}

function formatAddressSummary(row: LocationAdminRow): string {
  const parts = [
    row.addressLine1,
    row.addressLine2,
    [row.city, row.region].filter(Boolean).join(", "),
    row.postalCode,
    row.phone,
  ].filter(Boolean)
  if (parts.length === 0) return "Add address…"
  return parts.join(", ")
}

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function LocationsAdminPanel({
  businessSlug,
  locations,
}: {
  businessSlug: string
  locations: LocationAdminRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewRow, setViewRow] = useState<LocationAdminRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<LocationAdminRow | null>(null)
  const [addressRow, setAddressRow] = useState<LocationAdminRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<LocationAdminRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const addFromQuery = searchParams.get("add")
  useEffect(() => {
    if (addFromQuery !== "1") return
    setAddOpen(true)
    router.replace(`/${businessSlug}/business/locations`, { scroll: false })
  }, [addFromQuery, businessSlug, router])

  const addForm = useForm<AdminAddLocationFormValues>({
    resolver: standardSchemaResolver(adminAddLocationSchema),
    defaultValues: { locationName: "", locationSlug: "" },
  })

  const lastAutoAddSlug = useRef<string | null>(null)
  const addNameWatch = addForm.watch("locationName")
  useEffect(() => {
    const name = addNameWatch?.trim()
    if (!name) return
    const suggested = slugifyWebSegmentFromName(name)
    const current = (addForm.getValues("locationSlug") ?? "").trim()
    if (current === "" || current === lastAutoAddSlug.current) {
      addForm.setValue("locationSlug", suggested, { shouldValidate: true })
      lastAutoAddSlug.current = suggested
    }
  }, [addNameWatch, addForm])

  useEffect(() => {
    if (!addOpen) {
      addForm.reset({ locationName: "", locationSlug: "" })
      lastAutoAddSlug.current = null
    }
  }, [addOpen, addForm])

  const editForm = useForm<AdminLocationBranchCoreFormValues>({
    resolver: standardSchemaResolver(adminLocationBranchCoreSchema),
    defaultValues: {
      locationName: "",
      defaultCurrency: "PHP",
    },
  })

  const addressForm = useForm<SetupLocationFormValues>({
    resolver: standardSchemaResolver(setupLocationSchema),
    defaultValues: {
      defaultCurrency: "PHP",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
    },
  })

  const searchText = useCallback((row: LocationAdminRow) => {
    return [
      row.name,
      row.slug,
      row.city ?? "",
      row.region ?? "",
      row.defaultCurrency,
      row.addressLine1 ?? "",
      row.addressLine2 ?? "",
      row.postalCode ?? "",
      row.phone ?? "",
    ].join(" ")
  }, [])

  const openEdit = useCallback(
    (row: LocationAdminRow) => {
      editForm.reset({
        locationName: row.name,
        defaultCurrency: row.defaultCurrency as AdminLocationBranchCoreFormValues["defaultCurrency"],
      })
      setEditRow(row)
    },
    [editForm],
  )

  const openAddress = useCallback(
    (row: LocationAdminRow) => {
      addressForm.reset({
        defaultCurrency: row.defaultCurrency as SetupLocationFormValues["defaultCurrency"],
        addressLine1: row.addressLine1 ?? "",
        addressLine2: row.addressLine2 ?? "",
        city: row.city ?? "",
        region: row.region ?? "",
        postalCode: row.postalCode ?? "",
        phone: row.phone ?? "",
      })
      setAddressRow(row)
    },
    [addressForm],
  )

  const columns = useMemo<ColumnDef<LocationAdminRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isDefault ? (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            ) : null}
          </div>
        ),
      },
      { accessorKey: "slug", header: "Link" },
      { accessorKey: "defaultCurrency", header: "Currency" },
      {
        id: "address",
        header: "Address",
        cell: ({ row }) => {
          const r = row.original
          return (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground max-w-[min(280px,100%)] truncate text-left text-sm underline-offset-2 hover:underline"
              onClick={() => openAddress(r)}
            >
              {formatAddressSummary(r)}
            </button>
          )
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewRow(r)} aria-label="View">
                <EyeIcon className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(r)} aria-label="Edit">
                <PencilIcon className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeleteRow(r)} aria-label="Delete">
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </div>
          )
        },
      },
    ],
    [openEdit, openAddress],
  )

  async function onAddSubmit(values: AdminAddLocationFormValues) {
    try {
      await createOrganizationLocation(businessSlug, {
        locationSlug: values.locationSlug,
        locationName: values.locationName,
        location: {
          defaultCurrency: "PHP",
          addressLine1: undefined,
          addressLine2: undefined,
          city: undefined,
          region: undefined,
          postalCode: undefined,
          phone: undefined,
        },
      })
      addForm.reset({ locationName: "", locationSlug: "" })
      lastAutoAddSlug.current = null
      setAddOpen(false)
      router.refresh()
    } catch (err) {
      addForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not create location",
      })
    }
  }

  async function onEditSubmit(values: AdminLocationBranchCoreFormValues) {
    if (!editRow) return
    try {
      await updateOrganizationLocationBranch(businessSlug, editRow.id, {
        locationName: values.locationName,
        location: {
          defaultCurrency: values.defaultCurrency,
          addressLine1: editRow.addressLine1 ?? undefined,
          addressLine2: editRow.addressLine2 ?? undefined,
          city: editRow.city ?? undefined,
          region: editRow.region ?? undefined,
          postalCode: editRow.postalCode ?? undefined,
          phone: editRow.phone ?? undefined,
        },
      })
      setEditRow(null)
      router.refresh()
    } catch (err) {
      editForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not save",
      })
    }
  }

  async function onAddressSubmit(values: SetupLocationFormValues) {
    if (!addressRow) return
    try {
      await updateOrganizationLocationBranch(businessSlug, addressRow.id, {
        locationName: addressRow.name,
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
      setAddressRow(null)
      router.refresh()
    } catch (err) {
      addressForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not save",
      })
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return
    setDeleteError(null)
    try {
      await deleteOrganizationLocation(businessSlug, deleteRow.id)
      setDeleteRow(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage branches for this business. Each location has its own dashboard link and optional branch-only
          settings.
        </p>
      </div>

      <AdminSettingsTable
        columns={columns}
        data={locations}
        searchPlaceholder="Search by name, link, city…"
        searchText={searchText}
        toolbarRight={
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add location
          </Button>
        }
      />

      <Dialog open={viewRow !== null} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{viewRow?.name}</DialogTitle>
            <DialogDescription>Location link: /{businessSlug}/l/{viewRow?.slug}</DialogDescription>
          </DialogHeader>
          {viewRow ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Currency:</span> {viewRow.defaultCurrency}
              </p>
              <p>
                <span className="text-muted-foreground">Default branch:</span> {viewRow.isDefault ? "Yes" : "No"}
              </p>
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="whitespace-pre-wrap">
                  {[
                    viewRow.addressLine1,
                    viewRow.addressLine2,
                    [viewRow.city, viewRow.region].filter(Boolean).join(", "),
                    viewRow.postalCode,
                    viewRow.phone,
                  ]
                    .filter(Boolean)
                    .join("\n") || "—"}
                </p>
              </div>
              <Link
                href={`/${businessSlug}/l/${viewRow.slug}/settings/store`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-2 inline-flex w-full sm:w-auto")}
              >
                Open branch settings
              </Link>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
            <DialogDescription>
              Choose a display name and URL link. You can add the street address and currency from the table after
              it is created.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={addForm.handleSubmit(onAddSubmit)}
            onReset={() => addForm.clearErrors("root")}
          >
            <RootFormError message={addForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={addForm.control} name="locationName" label="Location name" />
              <TextFormField
                control={addForm.control}
                name="locationSlug"
                label="Location link"
                description="Lowercase letters, numbers, and hyphens only. Suggested from the name; you can edit it."
              />
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addForm.formState.isSubmitting}>
                {addForm.formState.isSubmitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addressRow !== null} onOpenChange={(open) => !open && setAddressRow(null)}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Branch address</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{addressRow?.name}</span>
              <span className="text-muted-foreground"> · /{addressRow?.slug}</span>
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={addressForm.handleSubmit(onAddressSubmit)}>
            <RootFormError message={addressForm.formState.errors.root?.message} />
            <FieldGroup>
              <SelectFormField
                control={addressForm.control}
                name="defaultCurrency"
                label="Currency"
                options={[
                  { value: "PHP", label: "PHP" },
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "GBP", label: "GBP" },
                ]}
              />
              <BranchAddressFields control={addressForm.control} />
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddressRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addressForm.formState.isSubmitting}>
                {addressForm.formState.isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit location</DialogTitle>
            <DialogDescription>
              Link: <span className="font-mono text-foreground">{editRow?.slug}</span> (read-only). Address is edited
              from the Address column.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <RootFormError message={editForm.formState.errors.root?.message} />
            <FieldGroup>
              <TextFormField control={editForm.control} name="locationName" label="Location name" />
              <SelectFormField
                control={editForm.control}
                name="defaultCurrency"
                label="Currency"
                options={[
                  { value: "PHP", label: "PHP" },
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "GBP", label: "GBP" },
                ]}
              />
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
            <DialogDescription>
              This removes <span className="font-medium text-foreground">{deleteRow?.name}</span> and its branch
              link. You cannot delete the last location.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
