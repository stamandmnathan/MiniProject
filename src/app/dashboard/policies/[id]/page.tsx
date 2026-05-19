'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Loader2,
  CheckCircle,
  Users,
  Globe,
  Clock,
  Copy,
  Check,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type Version = {
  id: string
  versionNum: number
  semver: string
  contentMd: string
  contentHash: string
  publishedAt: string | null
}

type Policy = {
  id: string
  title: string
  type: string
  status: string
  slug: string
  shareId: string
  currentVersionId: string | null
  versions: Version[]
}

type AcceptanceRecord = {
  id: string
  userIdentifier: string | null
  ipAddress: string
  userAgent: string | null
  acceptedAt: string
  policyVersion: { semver: string }
}

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [acceptances, setAcceptances] = useState<AcceptanceRecord[]>([])
  const [activeTab, setActiveTab] = useState<'editor' | 'versions' | 'acceptances'>('editor')
  const [editorContent, setEditorContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [pRes, aRes] = await Promise.all([
      fetch(`/api/policies/${id}`),
      fetch(`/api/policies/${id}/acceptances`),
    ])
    if (pRes.ok) {
      const p: Policy = await pRes.json()
      setPolicy(p)
      const latest = p.versions.sort((a, b) => b.versionNum - a.versionNum)[0]
      if (latest) setEditorContent(latest.contentMd)
    }
    if (aRes.ok) setAcceptances(await aRes.json())
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editorContent.trim()) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')
    const res = await fetch(`/api/policies/${id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentMd: editorContent }),
    })
    setSaving(false)
    if (res.ok) {
      const v: Version = await res.json()
      setSaveSuccess(`Saved as version ${v.versionNum}`)
      load()
    } else {
      setSaveError('Save failed')
    }
  }

  async function handlePublish(versionId: string) {
    setPublishing(versionId)
    const res = await fetch(`/api/policies/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    })
    setPublishing(null)
    if (res.ok) load()
  }

  if (!policy) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const sortedVersions = [...policy.versions].sort((a, b) => b.versionNum - a.versionNum)
  const publishedVersion = policy.versions.find((v) => v.id === policy.currentVersionId)

  const TYPE_LABELS: Record<string, string> = {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    custom: 'Custom',
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/policies"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Policies
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{policy.title}</h1>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  policy.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {policy.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {TYPE_LABELS[policy.type] ?? policy.type} ·{' '}
              <span className="font-mono text-xs">{policy.slug}</span>
            </p>
          </div>
          {policy.status === 'published' && (
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <Globe className="h-4 w-4 text-green-500 shrink-0" />
              <Link
                href={`/policies/${policy.shareId}`}
                target="_blank"
                className="text-sm font-mono text-gray-600 hover:text-brand-600 truncate max-w-48"
              >
                /policies/{policy.shareId}
              </Link>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/policies/${policy.shareId}`
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-brand-50 p-2 rounded-lg">
            <Clock className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{policy.versions.length}</p>
            <p className="text-xs text-gray-500">Saved versions</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-green-50 p-2 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {publishedVersion ? `v${publishedVersion.semver}` : '—'}
            </p>
            <p className="text-xs text-gray-500">Published version</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-purple-50 p-2 rounded-lg">
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{acceptances.length}</p>
            <p className="text-xs text-gray-500">Acceptances</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['editor', 'versions', 'acceptances'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'versions' && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {policy.versions.length}
              </span>
            )}
            {tab === 'acceptances' && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {acceptances.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Editor tab */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <textarea
              value={editorContent}
              onChange={(e) => { setEditorContent(e.target.value); setSaveSuccess('') }}
              placeholder="Write your policy in Markdown..."
              rows={24}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 transition resize-y"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !editorContent.trim()}
                className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Version
              </button>
              {saveSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  {saveSuccess}
                </span>
              )}
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Each save creates a new version. Saving does not affect the live public page.
            </p>
          </div>
        </div>
      )}

      {/* Versions tab */}
      {activeTab === 'versions' && (
        <div className="space-y-3">
          {sortedVersions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">
              No versions yet. Write content in the editor and save.
            </p>
          )}
          {sortedVersions.map((v) => {
            const isPublished = v.id === policy.currentVersionId
            return (
              <div
                key={v.id}
                className={`bg-white border rounded-xl p-5 ${
                  isPublished ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900">v{v.semver}</span>
                    {isPublished && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <Globe className="h-3 w-3" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditorContent(v.contentMd)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Load into editor
                    </button>
                    {!isPublished && (
                      <button
                        onClick={() => handlePublish(v.id)}
                        disabled={publishing === v.id}
                        className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        {publishing === v.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        Set as live
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-2 text-xs text-gray-400">
                  {v.publishedAt && (
                    <span>Published {formatDateTime(v.publishedAt)}</span>
                  )}
                  <span className="font-mono">{v.contentHash.slice(0, 20)}…</span>
                </div>
                <details className="mt-3">
                  <summary className="text-xs text-brand-600 cursor-pointer hover:text-brand-700 font-medium w-fit">
                    Preview content
                  </summary>
                  <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                    {v.contentMd.slice(0, 500)}{v.contentMd.length > 500 ? '…' : ''}
                  </pre>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {/* Acceptances tab */}
      {activeTab === 'acceptances' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href={`/dashboard/policies/${id}/acceptances`}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View full acceptance log →
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {acceptances.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No acceptances yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Who</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {acceptances.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm text-gray-900">
                        {r.userIdentifier ?? <span className="text-gray-400 italic text-xs">Anonymous</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(r.acceptedAt)}</td>
                      <td className="px-5 py-3 text-sm font-mono text-gray-500">{r.ipAddress}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          v{r.policyVersion.semver}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
