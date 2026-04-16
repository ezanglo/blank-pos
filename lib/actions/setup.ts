"use server"

import { APIError } from "better-auth/api"

import { auth } from "@/lib/auth"
import { getUserCount } from "@/lib/user-count"

function internalEmail(username: string) {
  return `${username.toLowerCase()}@users.blankpos.local`
}

export async function assertBootstrapAllowed() {
  const n = await getUserCount()
  if (n > 0) {
    throw new Error("Setup is only available before the first user exists.")
  }
}

export async function bootstrapCreateOwner(input: {
  username: string
  password: string
  name: string
}) {
  await assertBootstrapAllowed()
  const username = input.username.trim().toLowerCase()
  if (username.length < 2) throw new Error("Username is too short.")
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.")

  try {
    await auth.api.createUser({
      body: {
        email: internalEmail(username),
        password: input.password,
        name: input.name.trim(),
        data: { username, displayUsername: username },
      },
    })
  } catch (e) {
    if (e instanceof APIError) {
      throw new Error(e.message)
    }
    throw e
  }

  return { ok: true as const, username }
}
