import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organizations, policies, policyVersions, acceptanceRecords } from '@/lib/db/schema'
import { generateProofToken } from '@/lib/proof'
import { logAuditEvent } from '@/lib/audit'
import { getClientIp } from '@/lib/utils'
import { eq, and } from 'drizzle-orm'

const schema = z.object({
  userIdentifier: z.string().min(1),
  userMetadata: z.record(z.unknown()).optional(),
  versionId: z.string().uuid(),
  acceptanceMethod: z.enum(['checkbox', 'button', 'api', 'embed']).optional(),
})

type Params = { params: Promise<{ orgSlug: string; policySlug: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { orgSlug, policySlug } = await params

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const policy = await db.query.policies.findFirst({
    where: and(
      eq(policies.orgId, org.id),
      eq(policies.slug, policySlug),
      eq(policies.status, 'published')
    ),
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const version = await db.query.policyVersions.findFirst({
    where: and(
      eq(policyVersions.id, parsed.data.versionId),
      eq(policyVersions.policyId, policy.id)
    ),
  })
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? undefined
  const timestamp = new Date().toISOString()
  const proofToken = generateProofToken(version.id, parsed.data.userIdentifier, timestamp)

  const [record] = await db
    .insert(acceptanceRecords)
    .values({
      policyVersionId: version.id,
      userIdentifier: parsed.data.userIdentifier,
      userMetadata: parsed.data.userMetadata,
      ipAddress: ip,
      userAgent,
      acceptanceMethod: parsed.data.acceptanceMethod ?? 'button',
      proofToken,
    })
    .returning()

  await logAuditEvent({
    orgId: org.id,
    actorType: 'system',
    event: 'acceptance.recorded',
    resourceType: 'policy_version',
    resourceId: version.id,
    ipAddress: ip,
    userAgent,
    payload: {
      userIdentifier: parsed.data.userIdentifier,
      policyVersion: version.semver,
      proofToken,
      contentHash: version.contentHash,
    },
  })

  return NextResponse.json({
    proofToken: record.proofToken,
    acceptedAt: record.acceptedAt,
    versionHash: version.contentHash,
    semver: version.semver,
  })
}
