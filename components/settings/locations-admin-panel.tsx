"use client"

import { useCallback, useMemo, useState } from "react"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  type AdminLocationBranchFormValues,
  adminLocationBranchSchema,
  type SetupFirstLocationFormValues,
  setupFirstLocationSchema,
} from "@/lib/schemas/app-forms"
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
  // Shared field names between add (first location) and edit branch forms.
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
  const [viewRow, setViewRow] = useState<LocationAdminRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<LocationAdminRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<LocationAdminRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const addForm = useForm<SetupFirstLocationFormValues>({
    resolver: standardSchemaResolver(setupFirstLocationSchema),
    defaultValues: {
      locationName: "",
      locationSlug: "",
      defaultCurrency: "PHP",
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
    },
  })

  const editForm = useForm<AdminLocationBranchFormValues>({
    resolver: standardSchemaResolver(adminLocationBranchSchema),
    defaultValues: {
      locationName: "",
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
    return [row.name, row.slug, row.city ?? "", row.region ?? "", row.defaultCurrency].join(" ")
  }, [])

  const openEdit = useCallback(
    (row: LocationAdminRow) => {
      editForm.reset({
        locationName: row.name,
        defaultCurrency: row.defaultCurrency as AdminLocationBranchFormValues["defaultCurrency"],
        addressLine1: row.addressLine1 ?? "",
        addressLine2: row.addressLine2 ?? "",
        city: row.city ?? "",
        region: row.region ?? "",
        postalCode: row.postalCode ?? "",
        phone: row.phone ?? "",
      })
      setEditRow(row)
    },
    [editForm],
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
        id: "area",
        header: "City / region",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {[row.original.city, row.original.region].filter(Boolean).join(", ") || "—"}
          </span>
        ),
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
    [openEdit],
  )

  async function onAddSubmit(values: SetupFirstLocationFormValues) {
    try {
      await createOrganizationLocation(businessSlug, {
        locationSlug: values.locationSlug,
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
      addForm.reset()
      setAddOpen(false)
      router.refresh()
    } catch (err) {
      addForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not create location",
      })
    }
  }

  async function onEditSubmit(values: AdminLocationBranchFormValues) {
    if (!editRow) return
    try {
      await updateOrganizationLocationBranch(businessSlug, editRow.id, {
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
      setEditRow(null)
      router.refresh()
    } catch (err) {
      editForm.setError("root", {
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
            <DialogDescription>Create a new branch. The link is used in the URL and cannot be changed later in v1.</DialogDescription>
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
                description="Lowercase letters, numbers, and hyphens only."
              />
              <SelectFormField
                control={addForm.control}
                name="defaultCurrency"
                label="Currency"
                options={[
                  { value: "PHP", label: "PHP" },
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                  { value: "GBP", label: "GBP" },
                ]}
              />
              <BranchAddressFields control={addForm.control} />
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

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit location</DialogTitle>
            <DialogDescription>
              Link: <span className="font-mono text-foreground">{editRow?.slug}</span> (read-only)
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
              <BranchAddressFields control={editForm.control} />
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
