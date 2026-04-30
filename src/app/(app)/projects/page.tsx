import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProjectRow from './project-row'
import { STATUS_LABELS, type ProjectStatus } from '@/lib/types'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-base text-slate-500">
            All active projects across clients.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-base font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          + New project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-base">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <p className="text-base text-slate-500">No projects yet.</p>
          <Link
            href="/projects/new"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-base font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Create your first project
          </Link>
        </div>
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
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
