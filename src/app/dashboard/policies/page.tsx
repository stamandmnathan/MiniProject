import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { policies, acceptanceRecords } from '@/lib/db/schema'
import { eq, desc, inArray, count } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  dpa: 'DPA',
  cookie: 'Cookie Policy',
  refund: 'Refund Policy',
  custom: 'Custom',
}

const TYPE_COLORS: Record<string, string> = {
  terms: 'bg-blue-100 text-blue-700',
  privacy: 'bg-purple-100 text-purple-700',
  dpa: 'bg-indigo-100 text-indigo-700',
  cookie: 'bg-orange-100 text-orange-700',
  refund: 'bg-pink-100 text-pink-700',
  custom: 'bg-gray-100 text-gray-600',
}

export default async function PoliciesPage() {
  const session = await getSession()
  if (!session) return null

  const policiesList = await db.query.policies.findMany({
    where: eq(policies.orgId, session.orgId),
    with: { currentVersion: true },
    orderBy: desc(policies.updatedAt),
  })

  const publishedVersionIds = policiesList
    .filter((p) => p.currentVersionId)
    .map((p) => p.currentVersionId!)

  const acceptanceCounts =
    publishedVersionIds.length > 0
      ? await db
          .select({ policyVersionId: acceptanceRecords.policyVersionId, count: count() })
          .from(acceptanceRecords)
          .where(inArray(acceptanceRecords.policyVersionId, publishedVersionIds))
          .groupBy(acceptanceRecords.policyVersionId)
      : []

  const countMap = Object.fromEntries(
    acceptanceCounts.map((a) => [a.policyVersionId, Number(a.count)])
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your terms, privacy policies, and agreements
          </p>
        </div>
        <Link
          href="/dashboard/policies/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Policy
        </Link>
      </div>

      {policiesList.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-16 text-center">
          <p className="text-gray-400 text-sm mb-4">No policies yet</p>
          <Link
            href="/dashboard/policies/new"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create your first policy
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Policy
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Version
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Acceptances
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Updated
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {policiesList.map((p) => {
                const acceptanceCount = p.currentVersionId
                  ? (countMap[p.currentVersionId] ?? 0)
                  : 0
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/dashboard/policies/${p.id}`}
                        className="font-medium text-sm text-gray-900 hover:text-brand-600 transition-colors"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{p.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2 py-1 rounded-md font-medium ${TYPE_COLORS[p.type] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {TYPE_LABELS[p.type] ?? p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          p.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : p.status === 'archived'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {p.currentVersion ? (
                        <span className="font-mono text-xs">v{p.currentVersion.semver}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-gray-700">
                        {acceptanceCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">
                      {formatDate(p.updatedAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/dashboard/policies/${p.id}`}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Manage
                        </Link>
                        {p.status === 'published' && (
                          <Link
                            href={`/p/${session.orgSlug}/${p.slug}`}
                            target="_blank"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
