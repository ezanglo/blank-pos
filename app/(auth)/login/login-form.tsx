"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { getPostLoginRedirect } from "@/app/actions/nav"
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
import { TextFormField } from "@/components/form"
import { authClient } from "@/lib/auth-client"
import { type LoginFormValues, loginSchema } from "@/lib/schemas/app-forms"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function LoginForm() {
  const router = useRouter()
  const form = useForm<LoginFormValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    const signIn = await authClient.signIn.username({
      username: values.username,
      password: values.password,
    })
    if (signIn.error) {
      form.setError("root", { message: signIn.error.message ?? "Sign-in failed" })
      return
    }
    const next = await getPostLoginRedirect()
    router.replace(next)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your staff username and password.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <RootFormError message={form.formState.errors.root?.message} />
          <FieldGroup>
            <TextFormField
              control={form.control}
              name="username"
              label="Username"
              autoComplete="username"
            />
            <TextFormField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
