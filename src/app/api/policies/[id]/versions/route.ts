import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { marked } from 'marked'
import { z } from 'zod'
import { db } from '@/lib/db'
import { policies, policyVersions } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { eq, and, desc, count } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const versions = await db.query.policyVersions.findMany({
    where: eq(policyVersions.policyId, id),
    orderBy: desc(policyVersions.versionNum),
  })

  return NextResponse.json(versions)
}

const saveSchema = z.object({ contentMd: z.string().min(1) })

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const [countResult] = await db
    .select({ count: count() })
    .from(policyVersions)
    .where(eq(policyVersions.policyId, id))

  const versionNum = (Number(countResult?.count) ?? 0) + 1
  const contentHtml = await marked(parsed.data.contentMd)
  const contentHash = createHash('sha256').update(parsed.data.contentMd).digest('hex')

  const [version] = await db
    .insert(policyVersions)
    .values({
      policyId: id,
      versionNum,
      semver: String(versionNum),
      contentMd: parsed.data.contentMd,
      contentHtml,
      contentHash,
      publishedBy: session.id,
      // publishedAt intentionally null — caller must explicitly publish
    })
    .returning()

  await db.update(policies).set({ updatedAt: new Date() }).where(eq(policies.id, id))

  await logAuditEvent({
    orgId: session.orgId,
    actorId: session.id,
    event: 'policy.version_saved',
    resourceType: 'policy_version',
    resourceId: version.id,
    payload: { versionNum, contentHash },
  })

  return NextResponse.json(version, { status: 201 })
}
