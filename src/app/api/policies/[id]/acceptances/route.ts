import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { policies, acceptanceRecords } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, inArray, desc } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
    with: { versions: true },
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (policy.versions.length === 0) return NextResponse.json([])

  const versionIds = policy.versions.map((v) => v.id)

  const records = await db.query.acceptanceRecords.findMany({
    where: inArray(acceptanceRecords.policyVersionId, versionIds),
    with: { policyVersion: true },
    orderBy: desc(acceptanceRecords.acceptedAt),
    limit,
    offset,
  })

  return NextResponse.json(records)
}
