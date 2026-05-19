import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { policies, acceptanceRecords, auditLogs, policyVersions } from '@/lib/db/schema'
import { eq, count, desc, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { FileText, CheckCircle, BookOpen, ClipboardList } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [policiesList, recentLogs] = await Promise.all([
    db.query.policies.findMany({
      where: eq(policies.orgId, session.orgId),
      with: { currentVersion: true },
      orderBy: desc(policies.updatedAt),
      limit: 5,
    }),
    db.query.auditLogs.findMany({
      where: eq(auditLogs.orgId, session.orgId),
      orderBy: desc(auditLogs.occurredAt),
      limit: 8,
    }),
  ])

  const publishedPolicies = policiesList.filter((p) => p.status === 'published')

  let totalAcceptances = 0
  if (publishedPolicies.length > 0) {
    const versionIds = publishedPolicies.flatMap((p) =>
      p.currentVersionId ? [p.currentVersionId] : []
    )
    if (versionIds.length > 0) {
      const [result] = await db
        .select({ count: count() })
        .from(acceptanceRecords)
        .where(inArray(acceptanceRecords.policyVersionId, versionIds))
      totalAcceptances = Number(result?.count ?? 0)
    }
  }

  const stats = [
    { label: 'Total Policies', value: policiesList.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Published', value: publishedPolicies.length, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Acceptances', value: totalAcceptances, icon: CheckCircle, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Audit Events', value: recentLogs.length, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Policies</h2>
            <Link
              href="/dashboard/policies"
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {policiesList.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">
                No policies yet.{' '}
                <Link href="/dashboard/policies/new" className="text-brand-600 hover:underline">
                  Create one
                </Link>
              </p>
            )}
            {policiesList.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/policies/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.type}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : p.status === 'archived'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Activity</h2>
            <Link
              href="/dashboard/audit-logs"
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLogs.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No activity yet.</p>
            )}
            {recentLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {log.event}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(log.occurredAt)}
                  </span>
                </div>
                {log.ipAddress && (
                  <p className="text-xs text-gray-400 mt-0.5">{log.ipAddress}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
