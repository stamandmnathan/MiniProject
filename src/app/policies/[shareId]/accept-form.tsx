'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Shield } from 'lucide-react'

type AcceptLog = {
  ip: string
  userAgent: string
  acceptedAt: string
  version: number
  proofToken: string
  identifier: string | null
}

type Props = { shareId: string; policyTitle: string }

export function AcceptForm({ shareId, policyTitle }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<AcceptLog | null>(null)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/p/${shareId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() || null }),
    })
    setLoading(false)
    if (res.ok) {
      setLog(await res.json())
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (log) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Agreement recorded</p>
            <p className="text-sm text-gray-500">
              You accepted <strong>{policyTitle}</strong>
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          {log.identifier && <Row label="Email" value={log.identifier} />}
          <Row label="IP address" value={log.ip} mono />
          <Row label="Timestamp" value={new Date(log.acceptedAt).toLocaleString()} />
          <Row label="Browser" value={log.userAgent} mono truncate />
          <Row label="Policy version" value={`v${log.version}`} mono />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-brand-600 text-white py-4 rounded-xl text-base font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
        I Agree
      </button>

      <p className="text-xs text-gray-400 text-center">
        Your IP address, browser, and timestamp are recorded automatically.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  truncate,
}: {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span
        className={`text-xs text-right ${mono ? 'font-mono' : ''} ${truncate ? 'truncate max-w-48' : ''} text-gray-700`}
      >
        {value}
      </span>
    </div>
  )
}
