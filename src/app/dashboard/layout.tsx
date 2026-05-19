import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={session.orgSlug} userName={session.name} />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  )
}
