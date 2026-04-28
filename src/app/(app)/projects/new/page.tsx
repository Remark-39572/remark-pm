import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS, type ProjectStatus } from '@/lib/types'

async function createProjectAction(formData: FormData) {
  'use server'
  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const code = ((formData.get('code') as string) || '').trim() || null
  const client_id = (formData.get('client_id') as string) || null
  const status = (formData.get('status') as ProjectStatus) ?? 'active'
  const start_date = (formData.get('start_date') as string) || null
  const end_date = (formData.get('end_date') as string) || null
  const time_budget_hours_raw = formData.get('time_budget_hours') as string
  const time_budget_hours = time_budget_hours_raw
    ? Number(time_budget_hours_raw)
    : null
  const note = ((formData.get('note') as string) || '').trim() || null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      code,
      client_id,
      status,
      start_date,
      end_date,
      time_budget_hours,
      note,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/projects/${data.id}`)
}

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/projects" className="text-gray-500 hover:text-gray-900">
          Projects
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900">New project</span>
      </div>

      <form
        action={createProjectAction}
        className="max-w-2xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <Field label="Project name" required>
          <input
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Project code">
            <input
              name="code"
              type="text"
              placeholder="e.g. 047"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </Field>

          <Field label="Client">
            <select
              name="client_id"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">— Select —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {clients && clients.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No clients yet.{' '}
                <Link href="/clients" className="underline">
                  Add a client
                </Link>{' '}
                first.
              </p>
            )}
          </Field>
        </div>

        <Field label="Status">
          <select
            name="status"
            defaultValue="active"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <input
              name="start_date"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </Field>

          <Field label="End date">
            <input
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </Field>
        </div>

        <Field label="Time budget (hours)">
          <input
            name="time_budget_hours"
            type="number"
            step="0.25"
            min="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </Field>

        <Field label="Note">
          <textarea
            name="note"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/projects"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Create
          </button>
        </div>
      </form>
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
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
