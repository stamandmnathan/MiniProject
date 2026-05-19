'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ChevronLeft, Loader2 } from 'lucide-react'

const POLICY_TYPES = [
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'custom', label: 'Custom' },
]

export default function NewPolicyPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGenerating(true)
    setContent('')
    const fd = new FormData(e.currentTarget)

    const dataCollectedRaw = fd.get('dataCollected') as string
    const body = {
      type: fd.get('type') as string,
      productName: fd.get('productName') as string,
      productDescription: fd.get('productDescription') as string,
      dataCollected: dataCollectedRaw
        ? dataCollectedRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      jurisdiction: fd.get('jurisdiction') as string,
      usesCookies: fd.get('usesCookies') === 'true',
      hasPayments: fd.get('hasPayments') === 'true',
      contactEmail: fd.get('contactEmail') as string,
    }

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok || !res.body) {
      setGenerating(false)
      setError('Generation failed')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      const lines = text.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          if (parsed.text) {
            accumulated += parsed.text
            setContent(accumulated)
          }
        } catch {}
      }
    }

    setGenerating(false)
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    const policyRes = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: fd.get('type') as string,
        title: fd.get('title') as string,
      }),
    })

    if (!policyRes.ok) {
      setSaving(false)
      setError('Failed to create policy')
      return
    }

    const policy = await policyRes.json()

    if (content.trim()) {
      const publishRes = await fetch(`/api/policies/${policy.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMd: content, changeSummary: 'Initial version' }),
      })
      if (!publishRes.ok) {
        setSaving(false)
        setError('Failed to publish policy')
        return
      }
    }

    router.push(`/dashboard/policies/${policy.id}`)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/dashboard/policies"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Policies
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Policy</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Policy Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                name="title"
                type="text"
                required
                placeholder="Terms of Service"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <select
                name="type"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition bg-white"
              >
                {POLICY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Content</h2>
            <button
              type="button"
              onClick={() => setShowGenerate(!showGenerate)}
              className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
          </div>

          {showGenerate && (
            <form
              onSubmit={handleGenerate}
              className="border border-brand-200 bg-brand-50 rounded-xl p-5 space-y-3"
            >
              <h3 className="text-sm font-semibold text-brand-900">AI Generation</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Policy Type
                  </label>
                  <select
                    name="type"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {POLICY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    name="productName"
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product Description
                  </label>
                  <input
                    name="productDescription"
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Data Collected (comma separated)
                  </label>
                  <input
                    name="dataCollected"
                    type="text"
                    placeholder="email, name, payment info"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    name="contactEmail"
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Jurisdiction
                  </label>
                  <input
                    name="jurisdiction"
                    type="text"
                    placeholder="United States"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" name="usesCookies" value="true" className="rounded" />
                    Uses cookies
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" name="hasPayments" value="true" className="rounded" />
                    Processes payments
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={generating}
                className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </form>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Markdown Content
            </label>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Terms of Service&#10;&#10;Write your policy content in Markdown..."
              rows={24}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-y"
            />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {content.trim() ? 'Save & Publish' : 'Save Draft'}
          </button>
          <Link
            href="/dashboard/policies"
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
