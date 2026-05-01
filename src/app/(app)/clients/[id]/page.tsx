import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { revalidateAggregates } from '@/lib/revalidate'
import type { Person } from '@/lib/types'


export const dynamic = 'force-dynamic'

async function updateClientAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  if (!id || !name) return

  const code = ((formData.get('code') as string) || '').trim() || null
  const contact_name =
    ((formData.get('contact_name') as string) || '').trim() || null
  const contact_email =
    ((formData.get('contact_email') as string) || '').trim() || null
  const contact_phone =
    ((formData.get('contact_phone') as string) || '').trim() || null
  const address = ((formData.get('address') as string) || '').trim() || null
  const website = ((formData.get('website') as string) || '').trim() || null
  const note = ((formData.get('note') as string) || '').trim() || null
  const assignee_ids = formData.getAll('assignee_ids') as string[]

  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({
      name,
      code,
      contact_name,
      contact_email,
      contact_phone,
      address,
      website,
      note,
    })
    .eq('id', id)

  await supabase.from('client_assignees').delete().eq('client_id', id)
  if (assignee_ids.length > 0) {
    await supabase
      .from('client_assignees')
      .insert(assignee_ids.map((person_id) => ({ client_id: id, person_id })))
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  revalidateAggregates()
  redirect('/clients')
}

async function deleteClientAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  const now = new Date().toISOString()
  // Cascade soft-delete: client + its projects + their tasks
  await supabase.from('clients').update({ deleted_at: now }).eq('id', id)
  const { data: childProjects } = await supabase
    .from('projects')
    .update({ deleted_at: now })
    .eq('client_id', id)
    .is('deleted_at', null)
    .select('id')
  const projectIds = (childProjects ?? []).map((p) => p.id as string)
  if (projectIds.length > 0) {
    await supabase
      .from('tasks')
      .update({ deleted_at: now })
      .in('project_id', projectIds)
      .is('deleted_at', null)
  }

  revalidatePath('/clients')
  revalidateAggregates()
  redirect('/clients')
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, client_assignees(person_id)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) notFound()

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true, nullsFirst: false })

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('client_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const allPeople = (people ?? []) as Person[]
  const currentAssigneeIds = (client.client_assignees ?? []).map(
    (a: { person_id: string }) => a.person_id,
  )

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3 text-base">
        <Link href="/clients" className="text-slate-500 hover:text-slate-900">
          Clients
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">{client.name}</span>
      </div>

      <form
        action={updateClientAction}
        className="mb-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="id" value={client.id} />

        <div className="grid grid-cols-[1fr_140px] gap-5">
          <Field label="Client name" required>
            <input
              name="name"
              type="text"
              required
              defaultValue={client.name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
          <Field label="Client code">
            <input
              name="code"
              type="text"
              placeholder="e.g. SB"
              defaultValue={client.code ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Contact name">
            <input
              name="contact_name"
              type="text"
              defaultValue={client.contact_name ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
          <Field label="Contact email">
            <input
              name="contact_email"
              type="email"
              defaultValue={client.contact_email ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Contact phone">
            <input
              name="contact_phone"
              type="tel"
              defaultValue={client.contact_phone ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
          <Field label="Website">
            <input
              name="website"
              type="url"
              placeholder="https://"
              defaultValue={client.website ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>
        </div>

        <Field label="Address">
          <input
            name="address"
            type="text"
            defaultValue={client.address ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </Field>

        <Field label="Note">
          <textarea
            name="note"
            rows={3}
            defaultValue={client.note ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </Field>

        <Field label="Assigned team members">
          {allPeople.length === 0 ? (
            <p className="text-sm text-slate-500">No team members yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3 text-base text-slate-700">
              {allPeople.map((p) => (
                <label
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="assignee_ids"
                    value={p.id}
                    defaultChecked={currentAssigneeIds.includes(p.id)}
                  />
                  {p.name ?? p.email.split('@')[0]}
                </label>
              ))}
            </div>
          )}
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-2 text-base font-medium text-white transition hover:bg-slate-800"
          >
            Save changes
          </button>
        </div>
      </form>

      <form action={deleteClientAction} className="mb-8 flex justify-end">
        <input type="hidden" name="id" value={client.id} />
        <button
          type="submit"
          className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          Delete client
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Projects ({projects?.length ?? 0})
        </h2>
        {projects && projects.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50"
                >
                  <span className="text-base font-medium text-slate-900">
                    {p.name}
                  </span>
                  <span className="text-sm text-slate-500">{p.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-slate-500">No projects yet.</p>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}
