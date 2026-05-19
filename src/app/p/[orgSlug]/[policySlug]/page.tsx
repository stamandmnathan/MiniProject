'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ShieldCheck, Loader2, Calendar, Hash } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type PolicyData = {
  org: { name: string; slug: string }
  policy: { id: string; title: string; type: string; slug: string }
  version: {
    id: string
    semver: string
    contentHtml: string
    contentHash: string
    publishedAt: string | null
  }
}

export default function PublicPolicyPage() {
  const { orgSlug, policySlug } = useParams<{ orgSlug: string; policySlug: string }>()
  const [data, setData] = useState<PolicyData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [proofToken, setProofToken] = useState('')

  useEffect(() => {
    fetch(`/api/p/${orgSlug}/${policySlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setNotFound(true))
  }, [orgSlug, policySlug])

  async function handleAccept() {
    if (!data) return
    setAccepting(true)
    const userIdentifier = prompt('Enter your email address to confirm acceptance:')
    if (!userIdentifier) {
      setAccepting(false)
      return
    }
    const res = await fetch(`/api/p/${orgSlug}/${policySlug}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIdentifier,
        versionId: data.version.id,
        acceptanceMethod: 'button',
      }),
    })
    setAccepting(false)
    if (res.ok) {
      const d = await res.json()
      setProofToken(d.proofToken)
      setAccepted(true)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-400 text-lg font-medium">Policy not found</p>
          <p className="text-gray-400 text-sm mt-1">
            This policy may have been removed or is not yet published.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-gray-900">{data.org.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {data.version.publishedAt ? formatDate(data.version.publishedAt) : 'Unknown date'}
            </span>
            <span className="font-mono">v{data.version.semver}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.policy.title}</h1>
        <p className="text-gray-400 text-sm mb-10 capitalize">{data.policy.type} policy</p>

        <div
          className="prose-policy bg-white rounded-2xl border border-gray-200 p-8"
          dangerouslySetInnerHTML={{ __html: data.version.contentHtml }}
        />

        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
          {accepted ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-3">
                <ShieldCheck className="h-4 w-4" />
                Agreement recorded
              </div>
              <p className="text-sm text-gray-500 mb-2">Your acceptance has been logged.</p>
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-400 mb-1">Proof token</p>
                <code className="text-xs font-mono text-gray-600 break-all">{proofToken}</code>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Agree to {data.policy.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Your acceptance is timestamped and cryptographically recorded.
                </p>
              </div>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
                I Accept
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Hash className="h-3.5 w-3.5" />
          <span>
            Content hash:{' '}
            <span className="font-mono">{data.version.contentHash.slice(0, 24)}…</span>
          </span>
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by{' '}
          <span className="font-semibold text-gray-500">PolicyVault</span> · Compliance &
          proof-of-agreement layer
        </p>
      </footer>
    </div>
  )
}
