import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ROLE_LABELS, type Role } from '@/lib/types'

async function updatePersonAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const name = ((formData.get('name') as string) || '').trim() || null
  const role = formData.get('role') as Role
  const is_resource = formData.get('is_resource') === 'on'

  if (!id) return

  const supabase = await createClient()
  await supabase.from('people').update({ name, role, is_resource }).eq('id', id)
  revalidatePath('/people')
}

async function deletePersonAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('people')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/people')
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
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">People</h1>
        <p className="text-sm text-gray-500">
          {isAdminOrHigher
            ? 'Edit roles and resource settings below.'
            : 'View members.'}
        </p>
      </div>

      {!isAdminOrHigher && (
        <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
          You can view people but only admin/owner can edit.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              {isAdminOrHigher && (
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {people?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                {isAdminOrHigher ? (
                  <PersonEditableRow person={p} />
                ) : (
                  <PersonReadOnlyRow person={p} />
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">How to add a new member</p>
        <ol className="mt-2 ml-4 list-decimal space-y-1 text-blue-800">
          <li>その人に <code className="rounded bg-blue-100 px-1">remark-pm.vercel.app</code> を伝える</li>
          <li>Sign in 画面で自分のメール（@thinkremark.com）を入力</li>
          <li>受信メールのリンクで初回ログイン → 自動で people に追加（viewerロール）</li>
          <li>Sakiが上のテーブルでロール変更・リソース設定</li>
        </ol>
      </div>
    </div>
  )
}

function PersonEditableRow({
  person,
}: {
  person: {
    id: string
    email: string
    name: string | null
    role: Role
    is_resource: boolean
  }
}) {
  const formId = `person-form-${person.id}`
  return (
    <>
      <td className="px-4 py-3 text-gray-700">{person.email}</td>
      <td className="px-4 py-3">
        <form id={formId} action={updatePersonAction}>
          <input type="hidden" name="id" value={person.id} />
          <input
            type="text"
            name="name"
            defaultValue={person.name ?? ''}
            placeholder="—"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
          />
        </form>
      </td>
      <td className="px-4 py-3">
        <select
          form={formId}
          name="role"
          defaultValue={person.role}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
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
          className="mr-2 rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800"
        >
          Save
        </button>
        <form action={deletePersonAction} className="inline">
          <input type="hidden" name="id" value={person.id} />
          <button
            type="submit"
            className="text-xs text-red-600 hover:text-red-800"
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
  }
}) {
  return (
    <>
      <td className="px-4 py-3 text-gray-700">{person.email}</td>
      <td className="px-4 py-3 text-gray-900">{person.name ?? '—'}</td>
      <td className="px-4 py-3 text-gray-700">{ROLE_LABELS[person.role]}</td>
      <td className="px-4 py-3 text-gray-500">
        {person.is_resource ? '✓' : '—'}
      </td>
    </>
  )
}
