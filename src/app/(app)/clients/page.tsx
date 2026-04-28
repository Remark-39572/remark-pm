import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function createClientAction(formData: FormData) {
  'use server'
  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const supabase = await createClient()
  await supabase.from('clients').insert({ name })
  revalidatePath('/clients')
  revalidatePath('/projects')
}

async function deleteClientAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/clients')
  revalidatePath('/projects')
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Clients</h1>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <form action={createClientAction} className="flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="New client name"
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Add
          </button>
        </form>
      </div>

      {clients && clients.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteClientAction} className="inline">
                      <input type="hidden" name="id" value={client.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No clients yet. Add one above to get started.
        </p>
      )}
    </div>
  )
}
