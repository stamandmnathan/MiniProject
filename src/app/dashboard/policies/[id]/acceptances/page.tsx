import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { policies, acceptanceRecords } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import Link from 'next/link'
import { ChevronLeft, Users } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

export default async function AcceptancesPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
    with: { versions: true },
  })
  if (!policy) notFound()

  const versionIds = policy.versions.map((v) => v.id)
  const versionMap = Object.fromEntries(policy.versions.map((v) => [v.id, v.versionNum]))

  const records =
    versionIds.length > 0
      ? await db.query.acceptanceRecords.findMany({
          where: inArray(acceptanceRecords.policyVersionId, versionIds),
          orderBy: desc(acceptanceRecords.acceptedAt),
        })
      : []

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/policies/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {policy.title}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Acceptances</h1>
            <p className="text-gray-500 text-sm mt-1">{records.length} total records</p>
          </div>
          <div className="flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-xl">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-sm">{records.length}</span>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No acceptances yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            Share the public URL for this policy to start collecting agreements.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Who
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  When
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  IP Address
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Version
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Browser
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    {r.userIdentifier ? (
                      <span className="text-sm font-medium text-gray-900">
                        {r.userIdentifier}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Anonymous</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDateTime(r.acceptedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-mono text-gray-600">{r.ipAddress}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded-lg">
                      v{versionMap[r.policyVersionId] ?? '?'}
                    </span>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <span
                      className="text-xs text-gray-400 truncate block"
                      title={r.userAgent ?? ''}
                    >
                      {r.userAgent ?? '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
