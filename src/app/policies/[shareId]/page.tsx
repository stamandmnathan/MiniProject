import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { policies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { formatDate } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'
import { AcceptForm } from './accept-form'
import { CopyButton } from './copy-button'

type Params = { params: Promise<{ shareId: string }> }

async function getPolicy(shareId: string) {
  return db.query.policies.findFirst({
    where: and(eq(policies.shareId, shareId), eq(policies.status, 'published')),
    with: { currentVersion: true, organization: true },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { shareId } = await params
  const policy = await getPolicy(shareId)
  if (!policy) return { title: 'Policy Not Found' }
  return {
    title: `${policy.title} — ${policy.organization.name}`,
    description: `Review and accept the ${policy.title} from ${policy.organization.name}.`,
    openGraph: {
      title: `${policy.title} — ${policy.organization.name}`,
      description: `Review and accept the ${policy.title} from ${policy.organization.name}.`,
      type: 'website',
    },
  }
}

export default async function PublicPolicyPage({ params }: Params) {
  const { shareId } = await params
  const policy = await getPolicy(shareId)

  if (!policy?.currentVersion) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const publicUrl = `${appUrl}/policies/${shareId}`

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0" />
            <span className="font-semibold text-gray-900 truncate text-sm sm:text-base">
              {policy.organization.name}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {policy.currentVersion.publishedAt && (
              <span className="hidden sm:block text-xs text-gray-400">
                {formatDate(policy.currentVersion.publishedAt)}
              </span>
            )}
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
              v{policy.currentVersion.versionNum}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
            {policy.title}
          </h1>
          <p className="text-gray-400 text-sm capitalize">{policy.type} policy</p>
        </div>

        {/* Policy content */}
        <div
          className="prose-policy mb-12"
          dangerouslySetInnerHTML={{ __html: policy.currentVersion.contentHtml }}
        />

        {/* Acceptance card */}
        <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 bg-gray-50">
          <h2 className="font-semibold text-gray-900 text-lg mb-1">
            Accept this policy
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your acceptance is timestamped and recorded.
          </p>
          <AcceptForm shareId={shareId} policyTitle={policy.title} />
        </div>

        {/* Share row */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wide">
              Share this policy
            </p>
            <p className="text-sm font-mono text-gray-600 truncate">{publicUrl}</p>
          </div>
          <CopyButton text={publicUrl} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-semibold">PolicyVault</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
