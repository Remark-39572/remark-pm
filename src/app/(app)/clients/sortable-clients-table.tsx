'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { SortableList } from '@/app/_components/sortable-list'

type Client = {
  id: string
  code: string | null
  name: string
  contact_name: string | null
  contact_email: string | null
  assignees: { id: string; name: string | null; email: string }[]
  projectCount: number
}

export default function SortableClientsTable({
  clients,
  reorderAction,
}: {
  clients: Client[]
  reorderAction: (orderedIds: string[]) => Promise<void>
}) {
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-base">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="w-10 px-2 py-3"></th>
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-5 py-3 font-medium">Client</th>
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-5 py-3 font-medium">Team</th>
            <th className="px-5 py-3 font-medium">Projects</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <SortableList items={clients} onReorder={reorderAction}>
            {(c, handle) => (
              <ClientCells
                client={c}
                handle={handle}
                onOpen={() => router.push(`/clients/${c.id}`)}
              />
            )}
          </SortableList>
        </tbody>
      </table>
    </div>
  )
}

function ClientCells({
  client,
  handle,
  onOpen,
}: {
  client: Client
  handle: ReactNode
  onOpen: () => void
}) {
  return (
    <>
      <td className="px-2 py-4 align-middle">{handle}</td>
      <td
        onClick={onOpen}
        className="cursor-pointer px-5 py-4 text-sm text-slate-500 transition hover:bg-slate-50"
      >
        {client.code ?? '—'}
      </td>
      <td
        onClick={onOpen}
        className="cursor-pointer px-5 py-4 font-medium text-slate-900 transition hover:bg-slate-50"
      >
        {client.name}
      </td>
      <td
        onClick={onOpen}
        className="cursor-pointer px-5 py-4 text-slate-700 transition hover:bg-slate-50"
      >
        {client.contact_name || client.contact_email || (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td
        onClick={onOpen}
        className="cursor-pointer px-5 py-4 transition hover:bg-slate-50"
      >
        {client.assignees.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {client.assignees.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
              >
                {p.name ?? p.email.split('@')[0]}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td
        onClick={onOpen}
        className="cursor-pointer px-5 py-4 text-sm text-slate-500 transition hover:bg-slate-50"
      >
        {client.projectCount} {client.projectCount === 1 ? 'project' : 'projects'}
      </td>
    </>
  )
}
