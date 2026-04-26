"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import type { ColumnDef } from "@tanstack/react-table"
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AdminSettingsTable } from "@/components/admin/admin-settings-table"
import { staffCreateUser, staffRemoveMember, staffUpdateMemberRole } from "@/lib/actions/staff"
import { SelectFormField, TextFormField } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { type StaffCreateFormValues, staffCreateSchema } from "@/lib/schemas/app-forms"
import { z } from "zod"

const teamRoleEditSchema = z.object({
  role: z.enum(["manager", "cashier"]),
})
type TeamRoleEditFormValues = z.infer<typeof teamRoleEditSchema>

export type TeamMemberRow = {
  memberId: string
  userId: string
  role: string | null
  name: string
  email: string
  joinedAt: string
}

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function TeamAdminPanel({
  businessSlug,
  organizationId,
  currentUserId,
  currentRole,
  members,
}: {
  businessSlug: string
  organizationId: string
  currentUserId: string
  currentRole: string
  members: TeamMemberRow[]
}) {
  const router = useRouter()
  const [viewRow, setViewRow] = useState<TeamMemberRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<TeamMemberRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<TeamMemberRow | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const addForm = useForm<StaffCreateFormValues>({
    resolver: standardSchemaResolver(staffCreateSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "cashier",
    },
  })

  useEffect(() => {
    if (addOpen && currentRole !== "owner") {
      addForm.setValue("role", "cashier")
    }
  }, [addOpen, currentRole, addForm])

  const editForm = useForm<TeamRoleEditFormValues>({
    resolver: standardSchemaResolver(teamRoleEditSchema),
    defaultValues: { role: "cashier" },
  })

  const searchText = useCallback((row: TeamMemberRow) => {
    return [row.name, row.email, row.role ?? ""].join(" ")
  }, [])

  const canEditTarget = useCallback(
    (m: TeamMemberRow) => {
      if (m.userId === currentUserId) return false
      if (m.role === "owner") return false
      return currentRole === "owner"
    },
    [currentRole, currentUserId],
  )

  const canRemoveTarget = useCallback(
    (m: TeamMemberRow) => {
      if (m.userId === currentUserId) return false
      if (m.role === "owner") return false
      if (m.role === "manager" && currentRole !== "owner") return false
      return currentRole === "owner" || currentRole === "manager"
    },
    [currentRole, currentUserId],
  )

  const openEdit = useCallback(
    (row: TeamMemberRow) => {
      const r = (row.role === "manager" ? "manager" : "cashier") as TeamRoleEditFormValues["role"]
      editForm.reset({ role: r })
      setEditRow(row)
    },
    [editForm],
  )

  const columns = useMemo<ColumnDef<TeamMemberRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="text-muted-foreground capitalize">{row.original.role ?? "member"}</span>
        ),
      },
      {
        accessorKey: "joinedAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.joinedAt).toLocaleDateString()}
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
              {canEditTarget(r) ? (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(r)} aria-label="Edit">
                  <PencilIcon className="size-4" />
                </Button>
              ) : null}
              {canRemoveTarget(r) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteRow(r)}
                  aria-label="Delete"
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [canEditTarget, canRemoveTarget, openEdit],
  )

  async function onAddSubmit(values: StaffCreateFormValues) {
    const effectiveRole: "manager" | "cashier" = currentRole === "owner" ? values.role : "cashier"
    try {
      await staffCreateUser({
        organizationId,
        email: values.email,
        password: values.password,
        name: values.name,
        role: effectiveRole,
      })
      addForm.reset({ email: "", password: "", name: "", role: "cashier" })
      setAddOpen(false)
      router.refresh()
    } catch (err) {
      addForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not add member",
      })
    }
  }

  async function onEditSubmit(values: TeamRoleEditFormValues) {
    if (!editRow) return
    try {
      await staffUpdateMemberRole(businessSlug, editRow.memberId, values.role)
      setEditRow(null)
      router.refresh()
    } catch (err) {
      editForm.setError("root", {
        message: err instanceof Error ? err.message : "Could not update role",
      })
    }
  }

  async function confirmRemove() {
    if (!deleteRow) return
    setListError(null)
    setRemovingId(deleteRow.memberId)
    try {
      await staffRemoveMember(businessSlug, deleteRow.memberId)
      setDeleteRow(null)
      router.refresh()
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not remove")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage who can sign in to this business and their roles.</p>
      </div>

      {listError ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {listError}
        </p>
      ) : null}

      <AdminSettingsTable
        columns={columns}
        data={members}
        searchPlaceholder="Search by name or email…"
        searchText={searchText}
        toolbarRight={
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        }
      />

      <Dialog open={viewRow !== null} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{viewRow?.name}</DialogTitle>
            <DialogDescription>{viewRow?.email}</DialogDescription>
          </DialogHeader>
          {viewRow ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize">{viewRow.role ?? "member"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{new Date(viewRow.joinedAt).toLocaleString()}</dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Add an existing user by email, or create a new sign-in with a temporary password.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={addForm.handleSubmit(onAddSubmit)}>
            <RootFormError message={addForm.formState.errors.root?.message} />
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField control={addForm.control} name="email" label="Email" type="email" autoComplete="off" />
                <TextFormField
                  control={addForm.control}
                  name="password"
                  label="Temporary password (new users only)"
                  type="password"
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField control={addForm.control} name="name" label="Display name (new users only)" />
                {currentRole === "owner" ? (
                  <SelectFormField
                    control={addForm.control}
                    name="role"
                    label="Role"
                    options={[
                      { value: "cashier", label: "Cashier" },
                      { value: "manager", label: "Manager" },
                    ]}
                  />
                ) : (
                  <SelectFormField
                    control={addForm.control}
                    name="role"
                    label="Role"
                    options={[{ value: "cashier", label: "Cashier" }]}
                  />
                )}
              </div>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addForm.formState.isSubmitting}>
                {addForm.formState.isSubmitting ? "Working…" : "Add to team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              {editRow?.name} ({editRow?.email})
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editForm.handleSubmit(onEditSubmit)}>
            <RootFormError message={editForm.formState.errors.root?.message} />
            <FieldGroup>
              <SelectFormField
                control={editForm.control}
                name="role"
                label="Role"
                options={[
                  { value: "cashier", label: "Cashier" },
                  { value: "manager", label: "Manager" },
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
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              This removes <span className="font-medium text-foreground">{deleteRow?.name}</span> from this business.
              They will no longer be able to open it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removingId !== null}
              onClick={() => void confirmRemove()}
            >
              {removingId ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
