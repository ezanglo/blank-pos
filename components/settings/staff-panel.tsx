"use client"

import { useEffect, useState } from "react"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { staffCreateUser, staffRemoveMember } from "@/lib/actions/staff"
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
import { type StaffCreateFormValues, staffCreateSchema } from "@/lib/schemas/app-forms"

type MemberRow = {
  memberId: string
  userId: string
  role: string | null
  name: string
  email: string
}

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function StaffPanel({
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
  members: MemberRow[]
}) {
  const router = useRouter()
  const [listError, setListError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const form = useForm<StaffCreateFormValues>({
    resolver: standardSchemaResolver(staffCreateSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "cashier",
    },
  })

  useEffect(() => {
    if (currentRole !== "owner") {
      form.setValue("role", "cashier")
    }
  }, [currentRole, form])

  async function onCreate(values: StaffCreateFormValues) {
    const effectiveRole: "manager" | "cashier" =
      currentRole === "owner" ? values.role : "cashier"
    try {
      await staffCreateUser({
        organizationId,
        email: values.email,
        password: values.password,
        name: values.name,
        role: effectiveRole,
      })
      form.reset({ email: "", password: "", name: "", role: "cashier" })
      router.refresh()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Could not add staff",
      })
    }
  }

  async function onRemove(memberId: string) {
    setListError(null)
    setRemovingId(memberId)
    try {
      await staffRemoveMember(businessSlug, memberId)
      router.refresh()
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not remove")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {listError ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {listError}
        </p>
      ) : null}

      <form onSubmit={form.handleSubmit(onCreate)}>
        <Card>
          <CardHeader>
            <CardTitle>Add staff</CardTitle>
            <CardDescription>Create sign-ins with a real email and temporary password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RootFormError message={form.formState.errors.root?.message} />
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField
                  control={form.control}
                  name="email"
                  label="Email"
                  type="email"
                  autoComplete="off"
                />
                <TextFormField
                  control={form.control}
                  name="password"
                  label="Temporary password"
                  type="password"
                  autoComplete="new-password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField control={form.control} name="name" label="Display name" />
                {currentRole === "owner" ? (
                  <SelectFormField
                    control={form.control}
                    name="role"
                    label="Role"
                    options={[
                      { value: "cashier", label: "Cashier" },
                      { value: "manager", label: "Manager" },
                    ]}
                  />
                ) : (
                  <SelectFormField
                    control={form.control}
                    name="role"
                    label="Role"
                    options={[{ value: "cashier", label: "Cashier" }]}
                  />
                )}
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Working…" : "Create user & add to business"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>Members who can sign in to this business.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-xl border">
            {members.map((m) => (
              <li
                key={m.memberId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground ml-2">{m.email}</span>
                  <span className="text-muted-foreground ml-2 capitalize">
                    ({m.role ?? "member"})
                  </span>
                </div>
                {m.userId !== currentUserId && m.role !== "owner" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removingId !== null}
                    onClick={() => onRemove(m.memberId)}
                  >
                    {removingId === m.memberId ? "Removing…" : "Remove"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
