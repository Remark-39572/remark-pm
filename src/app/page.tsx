import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from './_components/logout-button'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">pm</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-lg font-medium text-gray-900">
            Welcome
          </h2>
          <p className="text-sm text-gray-600">
            ログイン成功。MVPの機能はこれから順次追加していきます。
          </p>
        </div>
      </div>
    </div>
  )
}
