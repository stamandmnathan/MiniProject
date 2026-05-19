import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { policies } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { slugify, generateShareId } from '@/lib/utils'
import { eq, desc } from 'drizzle-orm'

const createSchema = z.object({
  type: z.enum(['terms', 'privacy', 'custom']),
  title: z.string().min(1),
  slug: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db.query.policies.findMany({
    where: eq(policies.orgId, session.orgId),
    with: { currentVersion: true },
    orderBy: desc(policies.updatedAt),
  })

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const slug = parsed.data.slug ?? slugify(parsed.data.title)

  const [policy] = await db
    .insert(policies)
    .values({
      orgId: session.orgId,
      createdBy: session.id,
      type: parsed.data.type,
      title: parsed.data.title,
      slug,
      shareId: generateShareId(),
    })
    .returning()

  await logAuditEvent({
    orgId: session.orgId,
    actorId: session.id,
    event: 'policy.created',
    resourceType: 'policy',
    resourceId: policy.id,
    payload: { title: policy.title, type: policy.type },
  })

  return NextResponse.json(policy, { status: 201 })
}
