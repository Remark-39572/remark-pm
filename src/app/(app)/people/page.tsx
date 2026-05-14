import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateAggregates } from '@/lib/revalidate'
import AvatarUpload from './avatar-upload'
import { ROLE_LABELS, type Role } from '@/lib/types'

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
    .select('*')
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
            ? 'Edit roles and resource settings below. Reorder Resource members from the Timeline tab.'
            : 'View members.'}
        </p>
      </div>

      {!isAdminOrHigher && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          You can view people but only admin/owner can edit.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-base">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Photo</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              {isAdminOrHigher && (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                {isAdminOrHigher ? (
                  <PersonEditableRow
                    person={p}
                    updateAction={updatePersonAction}
                    deleteAction={deletePersonAction}
                  />
                ) : (
                  <PersonReadOnlyRow person={p} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

function PersonEditableRow({
  person,
  updateAction,
  deleteAction,
}: {
  person: {
    id: string
    email: string
    name: string | null
    role: Role
    is_resource: boolean
    avatar_url: string | null
  }
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const formId = `person-form-${person.id}`
  return (
    <>
      <td className="px-4 py-3">
        <AvatarUpload
          personId={person.id}
          personEmail={person.email}
          currentUrl={person.avatar_url}
        />
      </td>
      <td className="px-4 py-3 text-slate-700">{person.email}</td>
      <td className="px-4 py-3">
        <form id={formId} action={updateAction}>
          <input type="hidden" name="id" value={person.id} />
          <input
            type="text"
            name="name"
            defaultValue={person.name ?? ''}
            placeholder="—"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-900 focus:outline-none"
          />
        </form>
      </td>
      <td className="px-4 py-3">
        <select
          form={formId}
          name="role"
          defaultValue={person.role}
          className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-900 focus:outline-none"
        >
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          form={formId}
          type="checkbox"
          name="is_resource"
          defaultChecked={person.is_resource}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          form={formId}
          type="submit"
          className="mr-2 rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
        >
          Save
        </button>
        <form action={deleteAction} className="inline">
          <input type="hidden" name="id" value={person.id} />
          <button
            type="submit"
            className="text-xs text-rose-600 hover:text-rose-800"
          >
            Remove
          </button>
        </form>
      </td>
    </>
  )
}

function PersonReadOnlyRow({
  person,
}: {
  person: {
    email: string
    name: string | null
    role: Role
    is_resource: boolean
    avatar_url: string | null
  }
}) {
  return (
    <>
      <td className="px-4 py-3">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.email}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {person.email[0].toUpperCase()}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{person.email}</td>
      <td className="px-4 py-3 text-slate-900">{person.name ?? '—'}</td>
      <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[person.role]}</td>
      <td className="px-4 py-3 text-slate-500">
        {person.is_resource ? '✓' : '—'}
      </td>
    </>
  )
}
