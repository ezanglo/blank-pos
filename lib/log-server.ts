const SENSITIVE_KEY = /password|secret|token|cookie|authorization|bearer|refresh/i

export type ServerLogLevel = "error" | "warn"

/**
 * Structured server log for auth / org flows. Omits keys that look sensitive; never pass passwords.
 */
export function logAuthEvent(
  level: ServerLogLevel,
  event: string,
  meta: Record<string, unknown> = {},
): void {
  const payload: Record<string, unknown> = {
    level,
    event,
    ts: new Date().toISOString(),
  }
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(key)) continue
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined
    ) {
      payload[key] = value
    }
  }
  const line = JSON.stringify(payload)
  if (level === "warn") {
    console.warn(line)
  } else {
    console.error(line)
  }
}
