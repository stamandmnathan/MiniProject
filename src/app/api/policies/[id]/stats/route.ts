import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { policies, acceptanceRecords } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, count, inArray } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
    with: { versions: true, currentVersion: true },
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (policy.versions.length === 0) {
    return NextResponse.json({ policy, versions: [] })
  }

  const versionIds = policy.versions.map((v) => v.id)

  const acceptanceCounts = await db
    .select({ policyVersionId: acceptanceRecords.policyVersionId, count: count() })
    .from(acceptanceRecords)
    .where(inArray(acceptanceRecords.policyVersionId, versionIds))
    .groupBy(acceptanceRecords.policyVersionId)

  const countMap = Object.fromEntries(
    acceptanceCounts.map((a) => [a.policyVersionId, Number(a.count)])
  )

  const versionsWithStats = policy.versions.map((v) => ({
    ...v,
    acceptanceCount: countMap[v.id] ?? 0,
    isCurrent: v.id === policy.currentVersionId,
  }))

  const totalAcceptances = versionsWithStats.reduce((sum, v) => sum + v.acceptanceCount, 0)
  const currentVersionAcceptances =
    versionsWithStats.find((v) => v.isCurrent)?.acceptanceCount ?? 0

  return NextResponse.json({
    policy,
    versions: versionsWithStats,
    summary: { totalAcceptances, currentVersionAcceptances },
  })
}
