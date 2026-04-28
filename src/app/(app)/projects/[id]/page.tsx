import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  PHASE_LABELS,
  STATUS_LABELS,
  type Phase,
  type ProjectStatus,
} from '@/lib/types'

async function createTaskAction(formData: FormData) {
  'use server'
  const project_id = formData.get('project_id') as string
  const activity = (formData.get('activity') as string)?.trim()
  if (!project_id || !activity) return

  const phase = ((formData.get('phase') as string) || '') as Phase | ''
  const deliverable =
    ((formData.get('deliverable') as string) || '').trim() || null
  const start_date = (formData.get('start_date') as string) || null
  const due_date = (formData.get('due_date') as string) || null
  const note = ((formData.get('note') as string) || '').trim() || null
  const is_meeting = formData.get('is_meeting') === 'on'
  const is_onsite = formData.get('is_onsite') === 'on'
  const is_translation = formData.get('is_translation') === 'on'

  const supabase = await createClient()
  await supabase.from('tasks').insert({
    project_id,
    activity,
    phase: phase || null,
    deliverable,
    start_date,
    due_date,
    note,
    is_meeting,
    is_onsite,
    is_translation,
  })

  revalidatePath(`/projects/${project_id}`)
}

async function toggleTaskCompletedAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const completed = formData.get('completed') === 'true'
  const project_id = formData.get('project_id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
  revalidatePath(`/projects/${project_id}`)
}

async function deleteTaskAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const project_id = formData.get('project_id') as string
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath(`/projects/${project_id}`)
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!project) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, task_assignees(person_id, person:people(id, name, email))')
    .eq('project_id', id)
    .is('deleted_at', null)
    .order('start_date', { ascending: true, nullsFirst: false })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/projects" className="text-gray-500 hover:text-gray-900">
          Projects
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-900">{project.name}</span>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {project.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              {project.code && <span>#{project.code}</span>}
              {project.client && <span>{project.client.name}</span>}
              <StatusBadge status={project.status} />
            </div>
          </div>
        </div>
        {(project.start_date || project.end_date) && (
          <p className="mt-3 text-sm text-gray-600">
            {project.start_date ?? '—'} → {project.end_date ?? '—'}
          </p>
        )}
        {project.note && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
            {project.note}
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-medium text-gray-900">Tasks</h2>

      {tasks && tasks.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Deliverable</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="w-20 px-4 py-3 font-medium">Tags</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-gray-50 ${
                    task.completed ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <form action={toggleTaskCompletedAction}>
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="completed"
                        value={String(task.completed)}
                      />
                      <input
                        type="hidden"
                        name="project_id"
                        value={project.id}
                      />
                      <button
                        type="submit"
                        className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                          task.completed
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {task.completed && '✓'}
                      </button>
                    </form>
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      task.completed
                        ? 'text-gray-500 line-through'
                        : 'text-gray-900'
                    }`}
                  >
                    {task.activity}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.phase ? PHASE_LABELS[task.phase as Phase] : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {task.deliverable ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {task.start_date && task.due_date
                      ? `${task.start_date} → ${task.due_date}`
                      : task.due_date
                        ? `Due ${task.due_date}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div className="flex gap-1">
                      {task.is_meeting && <Tag>MTG</Tag>}
                      {task.is_onsite && <Tag>On-site</Tag>}
                      {task.is_translation && <Tag>翻訳</Tag>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteTaskAction} className="inline">
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="project_id"
                        value={project.id}
                      />
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
        <p className="mb-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No tasks yet. Add one below.
        </p>
      )}

      <details className="rounded-2xl border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-900">
          + Add task
        </summary>
        <form action={createTaskAction} className="mt-4 space-y-3">
          <input type="hidden" name="project_id" value={project.id} />

          <input
            name="activity"
            type="text"
            placeholder="Activity (required)"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              name="phase"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">— Phase (optional) —</option>
              {Object.entries(PHASE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              name="deliverable"
              type="text"
              placeholder="Deliverable (optional)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              name="start_date"
              type="date"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <input
              name="due_date"
              type="date"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <textarea
            name="note"
            rows={2}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_meeting" /> Meeting
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_onsite" /> On-site
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_translation" /> Translation
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Add task
          </button>
        </form>
      </details>
    </div>
  )
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-700',
    other: 'bg-blue-100 text-blue-800',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700">
      {children}
    </span>
  )
}
