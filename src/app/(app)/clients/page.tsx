import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { revalidateAggregates } from '@/lib/revalidate'
import { reorderClients } from '@/lib/actions/reorder'
import SortableClientsTable from './sortable-clients-table'

export const dynamic = 'force-dynamic'

async function createClientAction(formData: FormData) {
  'use server'
  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const supabase = await createClient()
  // Place new client at the end of the order
  const { data: maxRow } = await supabase
    .from('clients')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (maxRow?.sort_order ?? 0) + 10

  const { data, error } = await supabase
    .from('clients')
    .insert({ name, sort_order: nextOrder })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  revalidateAggregates()
  if (data?.id) redirect(`/clients/${data.id}`)
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select(
      '*, client_assignees(person:people(id, name, email)), projects:projects(id)',
    )
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const rows = (clients ?? []).map((c) => ({
    id: c.id as string,
    code: (c.code as string | null) ?? null,
    name: c.name as string,
    contact_name: (c.contact_name as string | null) ?? null,
    contact_email: (c.contact_email as string | null) ?? null,
    assignees: (c.client_assignees ?? [])
      .map(
        (a: {
          person: { id: string; name: string | null; email: string } | null
        }) => a.person,
      )
      .filter(Boolean) as {
      id: string
      name: string | null
      email: string
    }[],
    projectCount: (c.projects ?? []).length,
  }))

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Clients
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Drag the handle on the left to reorder. Click a row to see contact
            details and assigned team.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={createClientAction} className="flex gap-3">
          <input
            name="name"
            type="text"
            placeholder="New client name"
            required
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-slate-800"
          >
            Add
          </button>
        </form>
      </div>

      {rows.length > 0 ? (
        <SortableClientsTable clients={rows} reorderAction={reorderClients} />
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-base text-slate-500">
          No clients yet. Add one above to get started.
        </p>
      )}
    </div>
  )
}
