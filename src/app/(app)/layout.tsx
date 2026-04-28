import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '../_components/logout-button'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: me } = await supabase
    .from('people')
    .select('name, email, role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/projects" className="text-lg font-semibold text-gray-900">
              pm
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/projects">Projects</NavLink>
              <NavLink href="/clients">Clients</NavLink>
              <NavLink href="/people">People</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{me?.name ?? user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  )
}
