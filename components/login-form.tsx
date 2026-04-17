"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { TextFormField } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"
import { getPostLoginRedirect } from "@/lib/actions/nav"
import { authClient } from "@/lib/auth-client"
import { type LoginFormValues, loginSchema } from "@/lib/schemas/app-forms"
import { cn } from "@/lib/utils"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()

  const form = useForm<LoginFormValues>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    form.clearErrors("root")
    const signIn = await authClient.signIn.username({
      username: values.username.trim(),
      password: values.password,
    })
    if (signIn.error) {
      form.setError("root", {
        message: signIn.error.message ?? "Sign-in failed",
      })
      return
    }
    const next = await getPostLoginRedirect()
    router.replace(next)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Enter your Blank POS staff username and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <RootFormError message={form.formState.errors.root?.message} />
              <TextFormField
                control={form.control}
                name="username"
                label="Username"
                autoComplete="username"
                placeholder="your-username"
              />
              <TextFormField
                control={form.control}
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
              />
              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Signing in…" : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </form>
      <FieldDescription className="max-w-md px-6 text-center text-balance">
        This sign-in is for staff only. It is not a public page and should be used on store devices
        or trusted networks.
      </FieldDescription>
    </div>
  )
}
