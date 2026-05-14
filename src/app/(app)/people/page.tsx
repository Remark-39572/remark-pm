import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateAggregates } from '@/lib/revalidate'
import { type Role } from '@/lib/types'
import SortablePeopleTable from './sortable-people-table'

export const dynamic = 'force-dynamic'

async function updatePersonAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const name = ((formData.get('name') as string) || '').trim() || null
  const role = formData.get('role') as Role
  const is_resource = formData.get('is_resource') === 'on'

  if (!id) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('people')
    .update({ name, role, is_resource })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/people')
  revalidateAggregates()
}

async function deletePersonAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/people')
  revalidateAggregates()
}

async function reorderPeopleAction(orderedIds: string[]) {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.rpc('reorder_people', {
    ordered_ids: orderedIds,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/people')
  revalidatePath('/timeline')
  revalidatePath('/resources')
}

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from('people')
    .select('role')
    .eq('id', user!.id)
    .maybeSingle()

  const isAdminOrHigher = me?.role === 'owner' || me?.role === 'admin'

  const { data: people } = await supabase
    .from('people')
    .select('id, email, name, role, is_resource, avatar_url')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          People
        </h1>
        <p className="mt-1 text-base text-slate-500">
          {isAdminOrHigher
            ? 'Edit roles and resource settings below. Drag the handle on the left to reorder.'
            : 'View members. Drag the handle on the left to reorder.'}
        </p>
      </div>

      {!isAdminOrHigher && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          You can view people but only admin/owner can edit roles.
        </p>
      )}

      <SortablePeopleTable
        people={(people ?? []) as Parameters<typeof SortablePeopleTable>[0]['people']}
        isAdminOrHigher={isAdminOrHigher}
        updateAction={updatePersonAction}
        deleteAction={deletePersonAction}
        reorderAction={reorderPeopleAction}
      />

      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-medium">How to add a new member</p>
        <ol className="mt-2 ml-4 list-decimal space-y-1 text-sky-800">
          <li>Share <code className="rounded bg-sky-100 px-1">remark-pm.vercel.app</code> with the person.</li>
          <li>They enter their @thinkremark.com email on the Sign in screen.</li>
          <li>They click the magic-link email → auto-added here as a viewer.</li>
          <li>Saki updates their role and resource flag in the table above.</li>
        </ol>
      </div>
    </div>
  )
}
