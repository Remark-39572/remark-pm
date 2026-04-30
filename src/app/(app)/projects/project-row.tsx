'use client'

import { useRouter } from 'next/navigation'
import { STATUS_LABELS, type ProjectStatus } from '@/lib/types'

type Props = {
  project: {
    id: string
    code: string | null
    name: string
    status: ProjectStatus
    start_date: string | null
    end_date: string | null
    client: { name: string } | { name: string }[] | null
  }
}

export default function ProjectRow({ project }: Props) {
  const router = useRouter()
  const client = Array.isArray(project.client)
    ? project.client[0]
    : project.client

  return (
    <tr
      onClick={() => router.push(`/projects/${project.id}`)}
      className="cursor-pointer transition hover:bg-slate-50"
    >
      <td className="px-5 py-4 text-sm text-slate-500">
        {project.code ?? '—'}
      </td>
      <td className="px-5 py-4 font-medium text-slate-900">{project.name}</td>
      <td className="px-5 py-4 text-slate-700">{client?.name ?? '—'}</td>
      <td className="px-5 py-4">
        <StatusBadge status={project.status} />
      </td>
      <td className="px-5 py-4 text-sm text-slate-500">
        {project.start_date && project.end_date
          ? `${project.start_date} → ${project.end_date}`
          : project.start_date
            ? `From ${project.start_date}`
            : project.end_date
              ? `Until ${project.end_date}`
              : '—'}
      </td>
    </tr>
  )
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    on_hold: 'bg-amber-100 text-amber-800',
    completed: 'bg-slate-200 text-slate-700',
    other: 'bg-sky-100 text-sky-800',
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
