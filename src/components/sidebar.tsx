'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldCheck, LayoutDashboard, FileText, ClipboardList, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = { orgName: string; userName: string }

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/policies', label: 'Policies', icon: FileText, exact: false },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ClipboardList, exact: false },
]

export function Sidebar({ orgName, userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <ShieldCheck className="h-6 w-6 text-brand-600" />
        <span className="font-bold text-gray-900 text-sm">PolicyVault</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-gray-900 truncate">{orgName}</p>
          <p className="text-xs text-gray-500 truncate">{userName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
