import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, user } from "@/lib/db/schema"

export async function listMembersForOrganization(organizationId: string) {
  const db = getDb()
  return db
    .select({
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      name: user.name,
      email: user.email,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId))
}
