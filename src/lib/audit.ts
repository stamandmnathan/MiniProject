import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'

type AuditEvent = {
  orgId: string
  actorId?: string
  actorType?: 'user' | 'api_key' | 'system'
  event: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  payload?: Record<string, unknown>
}

export async function logAuditEvent(evt: AuditEvent): Promise<void> {
  await db.insert(auditLogs).values({
    orgId: evt.orgId,
    actorId: evt.actorId,
    actorType: evt.actorType ?? 'user',
    event: evt.event,
    resourceType: evt.resourceType,
    resourceId: evt.resourceId,
    ipAddress: evt.ipAddress,
    userAgent: evt.userAgent,
    payload: evt.payload,
  })
}
