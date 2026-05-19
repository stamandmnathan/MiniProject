import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { policies, acceptanceRecords } from '@/lib/db/schema'
import { generateProofToken } from '@/lib/proof'
import { logAuditEvent } from '@/lib/audit'
import { getClientIp } from '@/lib/utils'
import { eq, and } from 'drizzle-orm'

const schema = z.object({
  email: z.string().email().nullable().optional(),
})

type Params = { params: Promise<{ shareId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { shareId } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.shareId, shareId), eq(policies.status, 'published')),
    with: { currentVersion: true },
  })

  if (!policy?.currentVersion) {
    return NextResponse.json({ error: 'Policy not found or not published' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const identifier = parsed.success ? (parsed.data.email ?? null) : null

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const timestamp = new Date().toISOString()
  const proofToken = generateProofToken(policy.currentVersion.id, identifier ?? ip, timestamp)

  const [record] = await db
    .insert(acceptanceRecords)
    .values({
      policyVersionId: policy.currentVersion.id,
      userIdentifier: identifier,
      ipAddress: ip,
      userAgent,
      acceptanceMethod: 'button',
      proofToken,
    })
    .returning()

  await logAuditEvent({
    orgId: policy.orgId,
    actorType: 'system',
    event: 'acceptance.recorded',
    resourceType: 'policy_version',
    resourceId: policy.currentVersion.id,
    ipAddress: ip,
    userAgent,
    payload: {
      identifier,
      versionNum: policy.currentVersion.versionNum,
      contentHash: policy.currentVersion.contentHash,
    },
  })

  return NextResponse.json({
    accepted: true,
    identifier,
    ip,
    userAgent,
    acceptedAt: record.acceptedAt,
    version: policy.currentVersion.versionNum,
    proofToken: record.proofToken,
  })
}
