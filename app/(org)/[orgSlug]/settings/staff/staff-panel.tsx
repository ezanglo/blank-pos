"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { staffCreateUser, staffRemoveMember } from "@/app/actions/staff"
import { Button } from "@/components/ui/button"

type MemberRow = {
  memberId: string
  userId: string
  role: string | null
  name: string
  username: string | null
}

export function StaffPanel({
  orgSlug,
  organizationId,
  currentUserId,
  currentRole,
  members,
}: {
  orgSlug: string
  organizationId: string
  currentUserId: string
  currentRole: string
  members: MemberRow[]
}) {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"manager" | "cashier">("cashier")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const effectiveRole: "manager" | "cashier" = currentRole === "owner" ? role : "cashier"
      await staffCreateUser({
        organizationId,
        username,
        password,
        name,
        role: effectiveRole,
      })
      setUsername("")
      setPassword("")
      setName("")
      setRole("cashier")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add staff")
    } finally {
      setBusy(false)
    }
  }

  async function onRemove(memberId: string) {
    setError(null)
    setBusy(true)
    try {
      await staffRemoveMember(orgSlug, memberId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={onAdd}>
        <h2 className="text-lg font-medium">Add staff</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="staff-user">
              Username
            </label>
            <input
              id="staff-user"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="staff-pass">
              Temporary password
            </label>
            <input
              id="staff-pass"
              type="password"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="staff-name">
              Display name
            </label>
            <input
              id="staff-name"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="staff-role">
              Role
            </label>
            <select
              id="staff-role"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={currentRole === "owner" ? role : "cashier"}
              onChange={(e) => setRole(e.target.value as "manager" | "cashier")}
            >
              <option value="cashier">Cashier</option>
              {currentRole === "owner" ? <option value="manager">Manager</option> : null}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : "Create user & add to store"}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Team</h2>
        <ul className="divide-y rounded-xl border">
          {members.map((m) => (
            <li key={m.memberId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{m.name}</span>
                {m.username ? (
                  <span className="text-muted-foreground ml-2">@{m.username}</span>
                ) : null}
                <span className="text-muted-foreground ml-2 capitalize">({m.role})</span>
              </div>
              {m.userId !== currentUserId && m.role !== "owner" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onRemove(m.memberId)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
