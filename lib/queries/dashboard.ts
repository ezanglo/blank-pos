import { and, count, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { invitation, member } from "@/lib/db/schema"

export type MemberJoinChartPoint = {
  date: string
  /** Owners and managers who joined on this day. */
  desktop: number
  /** Other roles who joined on this day. */
  mobile: number
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function countMembersForOrganization(organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select({ c: count() })
    .from(member)
    .where(eq(member.organizationId, organizationId))
  return Number(row?.c ?? 0)
}

export async function countPendingInvitationsForOrganization(organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select({ c: count() })
    .from(invitation)
    .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending")))
  return Number(row?.c ?? 0)
}

/**
 * Daily join counts for charting (reuses chart series keys `desktop` / `mobile`).
 */
export async function getMemberJoinsDailySeries(
  organizationId: string,
  options?: { days?: number },
): Promise<MemberJoinChartPoint[]> {
  const days = options?.days ?? 120
  const db = getDb()
  const rows = await db
    .select({
      createdAt: member.createdAt,
      role: member.role,
    })
    .from(member)
    .where(eq(member.organizationId, organizationId))

  const end = new Date()
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endUtc)
    d.setUTCDate(d.getUTCDate() - i)
    keys.push(utcDateKey(d))
  }

  const bucket = new Map<string, { desktop: number; mobile: number }>()
  for (const k of keys) {
    bucket.set(k, { desktop: 0, mobile: 0 })
  }

  for (const r of rows) {
    const created = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as string)
    const key = utcDateKey(created)
    const b = bucket.get(key)
    if (!b) continue
    const elevated = r.role === "owner" || r.role === "manager"
    if (elevated) b.desktop += 1
    else b.mobile += 1
  }

  return keys.map((date) => {
    const v = bucket.get(date)!
    return { date, desktop: v.desktop, mobile: v.mobile }
  })
}
