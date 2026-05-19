import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { acceptanceRecords } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ proofToken: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { proofToken } = await params

  const record = await db.query.acceptanceRecords.findFirst({
    where: eq(acceptanceRecords.proofToken, proofToken),
    with: { policyVersion: true },
  })

  if (!record) {
    return NextResponse.json({ valid: false, error: 'Token not found' }, { status: 404 })
  }

  return NextResponse.json({
    valid: true,
    acceptance: {
      userIdentifier: record.userIdentifier,
      acceptedAt: record.acceptedAt,
      acceptanceMethod: record.acceptanceMethod,
      ipAddress: record.ipAddress,
    },
    policy: {
      version: record.policyVersion.semver,
      contentHash: record.policyVersion.contentHash,
      publishedAt: record.policyVersion.publishedAt,
    },
  })
}
