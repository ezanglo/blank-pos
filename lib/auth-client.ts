import { adminClient, organizationClient, usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/client"

function clientBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: clientBaseUrl(),
  plugins: [usernameClient(), organizationClient(), adminClient()],
})
