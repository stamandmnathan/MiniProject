import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const event = searchParams.get('event')

  const conditions = [eq(auditLogs.orgId, session.orgId)]
  if (event) conditions.push(eq(auditLogs.event, event))

  const logs = await db.query.auditLogs.findMany({
    where: and(...conditions),
    orderBy: desc(auditLogs.occurredAt),
    limit,
    offset,
  })

  return NextResponse.json(logs)
}
