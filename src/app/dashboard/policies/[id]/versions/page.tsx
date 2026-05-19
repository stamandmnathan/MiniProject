import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { policies, policyVersions, acceptanceRecords } from '@/lib/db/schema'
import { eq, and, desc, inArray, count } from 'drizzle-orm'
import Link from 'next/link'
import { ChevronLeft, Globe } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { PublishButton } from './publish-button'

type Params = { params: Promise<{ id: string }> }

export default async function PolicyVersionsPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const policy = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.orgId, session.orgId)),
  })
  if (!policy) notFound()

  const versions = await db.query.policyVersions.findMany({
    where: eq(policyVersions.policyId, id),
    orderBy: desc(policyVersions.versionNum),
  })

  const versionIds = versions.map((v) => v.id)
  const acceptanceCounts =
    versionIds.length > 0
      ? await db
          .select({ policyVersionId: acceptanceRecords.policyVersionId, count: count() })
          .from(acceptanceRecords)
          .where(inArray(acceptanceRecords.policyVersionId, versionIds))
          .groupBy(acceptanceRecords.policyVersionId)
      : []

  const countMap = Object.fromEntries(
    acceptanceCounts.map((a) => [a.policyVersionId, Number(a.count)])
  )

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
        <h1 className="text-2xl font-bold text-gray-900">Version History</h1>
        <p className="text-gray-500 text-sm mt-1">{versions.length} versions saved</p>
      </div>

      {versions.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed rounded-2xl p-16 text-center">
          <p className="text-gray-400 text-sm">No versions saved yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((v) => {
            const isPublished = v.id === policy.currentVersionId
            const acceptanceCount = countMap[v.id] ?? 0
            return (
              <div
                key={v.id}
                className={`bg-white border rounded-xl p-5 ${
                  isPublished ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-gray-900">
                      v{v.semver}
                    </span>
                    {isPublished && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <Globe className="h-3 w-3" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      <strong className="text-gray-900">{acceptanceCount}</strong> acceptances
                    </span>
                    {!isPublished && (
                      <PublishButton policyId={id} versionId={v.id} />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                  {v.publishedAt && <span>Set live {formatDateTime(v.publishedAt)}</span>}
                  <span className="font-mono">SHA-256: {v.contentHash.slice(0, 24)}…</span>
                </div>

                <details className="mt-3">
                  <summary className="text-xs text-brand-600 cursor-pointer hover:text-brand-700 font-medium w-fit">
                    Preview content
                  </summary>
                  <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                    {v.contentMd.slice(0, 600)}{v.contentMd.length > 600 ? '…' : ''}
                  </pre>
                </details>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
