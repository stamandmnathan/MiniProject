import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

const EVENT_COLORS: Record<string, string> = {
  'policy.created': 'bg-blue-100 text-blue-700',
  'policy.published': 'bg-green-100 text-green-700',
  'policy.updated': 'bg-yellow-100 text-yellow-700',
  'policy.deleted': 'bg-red-100 text-red-700',
  'acceptance.recorded': 'bg-purple-100 text-purple-700',
}

type Props = { searchParams: Promise<{ event?: string; page?: string }> }

export default async function AuditLogsPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const sp = await searchParams
  const pageNum = parseInt(sp.page ?? '1')
  const eventFilter = sp.event
  const limit = 50
  const offset = (pageNum - 1) * limit

  const conditions = [eq(auditLogs.orgId, session.orgId)]
  if (eventFilter) conditions.push(eq(auditLogs.event, eventFilter))

  const logs = await db.query.auditLogs.findMany({
    where: and(...conditions),
    orderBy: desc(auditLogs.occurredAt),
    limit: limit + 1,
    offset,
  })

  const hasMore = logs.length > limit
  const pageLogs = hasMore ? logs.slice(0, limit) : logs

  const EVENTS = [
    'policy.created',
    'policy.published',
    'policy.updated',
    'policy.deleted',
    'acceptance.recorded',
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Immutable record of all events in your organization
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <a
          href="/dashboard/audit-logs"
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            !eventFilter
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All
        </a>
        {EVENTS.map((e) => (
          <a
            key={e}
            href={`/dashboard/audit-logs?event=${e}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              eventFilter === e
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {e}
          </a>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {pageLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No audit events found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Event
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actor
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  IP Address
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Resource
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-medium ${
                        EVENT_COLORS[log.event] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {log.event}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">
                      {log.actorType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-gray-500">
                    {log.ipAddress ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {log.resourceType && (
                      <span>
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="ml-1 font-mono">
                            {log.resourceId.slice(0, 8)}…
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {formatDateTime(log.occurredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(pageNum > 1 || hasMore) && (
        <div className="flex items-center justify-between mt-4">
          {pageNum > 1 ? (
            <a
              href={`/dashboard/audit-logs?page=${pageNum - 1}${eventFilter ? `&event=${eventFilter}` : ''}`}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              ← Previous
            </a>
          ) : (
            <span />
          )}
          {hasMore && (
            <a
              href={`/dashboard/audit-logs?page=${pageNum + 1}${eventFilter ? `&event=${eventFilter}` : ''}`}
              className="text-sm text-brand-600 hover:underline font-medium"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
