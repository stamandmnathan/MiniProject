import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, policies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ orgSlug: string; policySlug: string }> }

export async function GET(req: NextRequest, { params }: Params) {
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
    with: { currentVersion: true },
  })

  if (!policy?.currentVersion) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    org: { name: org.name, slug: org.slug },
    policy: { id: policy.id, title: policy.title, type: policy.type, slug: policy.slug },
    version: {
      id: policy.currentVersion.id,
      semver: policy.currentVersion.semver,
      contentHtml: policy.currentVersion.contentHtml,
      contentHash: policy.currentVersion.contentHash,
      publishedAt: policy.currentVersion.publishedAt,
    },
  })
}
