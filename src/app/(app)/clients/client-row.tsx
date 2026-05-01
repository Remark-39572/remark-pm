'use client'

import { useRouter } from 'next/navigation'

type Props = {
  client: {
    id: string
    code: string | null
    name: string
    contact_name: string | null
    contact_email: string | null
    assignees: { id: string; name: string | null; email: string }[]
    projectCount: number
  }
}

export default function ClientRow({ client }: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/clients/${client.id}`)}
      className="cursor-pointer transition hover:bg-slate-50"
    >
      <td className="px-5 py-4 text-sm text-slate-500">
        {client.code ?? '—'}
      </td>
      <td className="px-5 py-4 font-medium text-slate-900">{client.name}</td>
      <td className="px-5 py-4 text-slate-700">
        {client.contact_name || client.contact_email || (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 py-4">
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
      <td className="px-5 py-4 text-sm text-slate-500">
        {client.projectCount} {client.projectCount === 1 ? 'project' : 'projects'}
      </td>
    </tr>
  )
}
