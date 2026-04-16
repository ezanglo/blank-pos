"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { getPostLoginRedirect } from "@/app/actions/nav"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const signIn = await authClient.signIn.username({ username, password })
      if (signIn.error) {
        setError(signIn.error.message ?? "Sign-in failed")
        return
      }
      const next = await getPostLoginRedirect()
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="login-username">
          Username
        </label>
        <input
          id="login-username"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
