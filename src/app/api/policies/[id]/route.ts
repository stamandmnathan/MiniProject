import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { policies } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { logAuditEvent } from '@/lib/audit'
import { eq, and } from 'drizzle-orm'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
    with: { currentVersion: true, versions: true },
  })

  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(policy)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const [updated] = await db
    .update(policies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(policies.id, id), eq(policies.orgId, session.orgId)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAuditEvent({
    orgId: session.orgId,
    actorId: session.id,
    event: 'policy.updated',
    resourceType: 'policy',
    resourceId: id,
    payload: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [deleted] = await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.orgId, session.orgId)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await logAuditEvent({
    orgId: session.orgId,
    actorId: session.id,
    event: 'policy.deleted',
    resourceType: 'policy',
    resourceId: id,
    payload: { title: deleted.title },
  })

  return NextResponse.json({ success: true })
}
