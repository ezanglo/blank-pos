"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { getLoginRedirectIfAuthed } from "@/lib/actions/nav"
import { authClient } from "@/lib/auth-client"
import { signUpSchema, type SignUpFormValues } from "@/lib/schemas/app-forms"
import { cn } from "@/lib/utils"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  const form = useForm<SignUpFormValues>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  const disabled = checkingSession || form.formState.isSubmitting

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await getLoginRedirectIfAuthed()
        if (!cancelled && next) router.replace(next)
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  async function onSubmit(values: SignUpFormValues) {
    const res = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    })
    if (res.error) {
      form.setError("root", {
        message: res.error.message ?? "Sign-up failed",
      })
      return
    }
    // Full navigation: session cookies from sign-up are on the auth response, but the next
    // Server Action (`getPostLoginRedirect`) can run before those cookies ride along — so
    // `router.replace` + `router.refresh` often landed on `/login` with no visible move.
    // A document load to `/` lets `app/page.tsx` read the session and redirect to onboarding, etc.
    window.location.assign("/")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={checkingSession ? "opacity-60" : undefined}>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Sign up with email and password to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <RootFormError message={form.formState.errors.root?.message} />
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                    <FieldContent>
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        disabled={disabled}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                    <FieldContent>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        disabled={disabled}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <FieldContent>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        disabled={disabled}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signup-confirm">Confirm password</FieldLabel>
                    <FieldContent>
                      <Input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        disabled={disabled}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                )}
              />
              <Field>
                <Button type="submit" disabled={disabled}>
                  {form.formState.isSubmitting ? "Creating account…" : "Sign up"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Log in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
