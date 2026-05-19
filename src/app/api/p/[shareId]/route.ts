import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { policies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ shareId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { shareId } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.shareId, shareId), eq(policies.status, 'published')),
    with: { currentVersion: true, organization: true },
  })

  if (!policy?.currentVersion) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: policy.id,
    shareId: policy.shareId,
    title: policy.title,
    type: policy.type,
    orgName: policy.organization.name,
    version: {
      id: policy.currentVersion.id,
      versionNum: policy.currentVersion.versionNum,
      contentHtml: policy.currentVersion.contentHtml,
      contentHash: policy.currentVersion.contentHash,
      publishedAt: policy.currentVersion.publishedAt,
    },
  })
}
