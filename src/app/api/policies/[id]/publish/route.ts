import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { policies, policyVersions } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { eq, and } from 'drizzle-orm'

const schema = z.object({ versionId: z.string().uuid() })

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const version = await db.query.policyVersions.findFirst({
    where: and(
      eq(policyVersions.id, parsed.data.versionId),
      eq(policyVersions.policyId, id)
    ),
  })
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  await db
    .update(policyVersions)
    .set({ publishedAt: new Date() })
    .where(eq(policyVersions.id, version.id))

  await db
    .update(policies)
    .set({ currentVersionId: version.id, status: 'published', updatedAt: new Date() })
    .where(eq(policies.id, id))

  await logAuditEvent({
    orgId: session.orgId,
    actorId: session.id,
    event: 'policy.published',
    resourceType: 'policy_version',
    resourceId: version.id,
    payload: { versionNum: version.versionNum, contentHash: version.contentHash },
  })

  return NextResponse.json({ success: true, publishedVersionId: version.id })
}
