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

  const isAdminOrHigher = me?.role === 'owner' || me?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                R
              </span>
              Remark
            </Link>
            <nav className="flex items-center gap-1 text-base">
              <NavLink href="/projects">Projects</NavLink>
              <NavLink href="/timeline">Timeline</NavLink>
              <NavLink href="/resources">Resources</NavLink>
              <NavLink href="/clients">Clients</NavLink>
              <NavLink href="/people">People</NavLink>
              {isAdminOrHigher && <NavLink href="/trash">Trash</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-base text-slate-600">
            <span>{me?.name ?? user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="w-full px-6 py-8">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  )
}
