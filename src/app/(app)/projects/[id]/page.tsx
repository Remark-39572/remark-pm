import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { revalidateAggregates } from '@/lib/revalidate'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Priority,
  type ProjectStatus,
} from '@/lib/types'
import TaskCheckbox from './task-checkbox'

export const dynamic = 'force-dynamic'

async function toggleTaskCompletedAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const completed = formData.get('completed') === 'true'
  const project_id = formData.get('project_id') as string
  if (!id) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ completed: !completed })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${project_id}`)
}

async function deleteTaskAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const project_id = formData.get('project_id') as string
  if (!id) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${project_id}`)
  revalidateAggregates()
}

async function updateProjectAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const start_date = (formData.get('start_date') as string) || null
  const end_date = (formData.get('end_date') as string) || null
  if (!id || !name || !start_date || !end_date) return

  const client_id = (formData.get('client_id') as string) || null
  const status = (formData.get('status') as ProjectStatus) ?? 'active'
  const time_budget_hours_raw = formData.get('time_budget_hours') as string
  const time_budget_hours = time_budget_hours_raw
    ? Number(time_budget_hours_raw)
    : null
  const note = ((formData.get('note') as string) || '').trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      name,
      client_id,
      status,
      start_date,
      end_date,
      time_budget_hours,
      note,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath(`/projects/${id}`)
  revalidateAggregates()
  redirect(`/projects/${id}`)
}

async function deleteProjectAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  const now = new Date().toISOString()
  // Cascade soft-delete: project + its tasks
  const { error: projectError } = await supabase
    .from('projects')
    .update({ deleted_at: now })
    .eq('id', id)
  if (projectError) throw new Error(projectError.message)

  const { error: tasksError } = await supabase
    .from('tasks')
    .update({ deleted_at: now })
    .eq('project_id', id)
    .is('deleted_at', null)
  if (tasksError) throw new Error(tasksError.message)

  revalidateAggregates()
  redirect('/projects')
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { id } = await params
  const { edit } = await searchParams
  const isEditing = edit === '1'

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
    .order('created_at', { ascending: true })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3 text-base">
        <Link
          href="/projects"
          className="text-slate-500 hover:text-slate-900"
        >
          Projects
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">{project.name}</span>
      </div>

      {isEditing ? (
        <form
          action={updateProjectAction}
          className="mb-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="id" value={project.id} />

          <Field label="Project name" required>
            <input
              name="name"
              type="text"
              required
              defaultValue={project.name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>

          <Field label="Client">
            <select
              name="client_id"
              defaultValue={project.client_id ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">— None —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              name="status"
              defaultValue={project.status}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" required>
              <input
                name="start_date"
                type="date"
                lang="en"
                required
                defaultValue={project.start_date ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </Field>
            <Field label="End date" required>
              <input
                name="end_date"
                type="date"
                lang="en"
                required
                defaultValue={project.end_date ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </Field>
          </div>

          <Field label="Time budget (hours)">
            <input
              name="time_budget_hours"
              type="number"
              step="0.25"
              min="0"
              defaultValue={project.time_budget_hours ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>

          <Field label="Note">
            <textarea
              name="note"
              rows={3}
              defaultValue={project.note ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href={`/projects/${project.id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-base font-medium text-white transition hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {project.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-base text-slate-500">
                {project.client?.code && <span>#{project.client.code}</span>}
                {project.client && <span>{project.client.name}</span>}
                <StatusBadge status={project.status} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${project.id}/timeline`}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Timeline →
              </Link>
              <Link
                href={`/projects/${project.id}?edit=1`}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Edit
              </Link>
              <form
                action={deleteProjectAction}
                className="inline"
              >
                <input type="hidden" name="id" value={project.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
          {(project.start_date || project.end_date) && (
            <p className="mt-4 text-base text-slate-600">
              {project.start_date ?? '—'} → {project.end_date ?? '—'}
            </p>
          )}
          {project.note && (
            <p className="mt-4 whitespace-pre-wrap text-base text-slate-700">
              {project.note}
            </p>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
        <Link
          href={`/projects/${project.id}/tasks/new`}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          + New task
        </Link>
      </div>

      {tasks && tasks.length > 0 ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-base">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 font-medium">Done</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Deliverable</th>
                <th className="px-4 py-3 font-medium">Assignees</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="w-20 px-4 py-3 font-medium">Tags</th>
                <th className="w-32 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const currentAssignees = (task.task_assignees ?? [])
                  .map(
                    (ta: {
                      person:
                        | { id: string; name: string | null; email: string }
                        | null
                    }) => ta.person,
                  )
                  .filter(Boolean) as {
                  id: string
                  name: string | null
                  email: string
                }[]
                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <TaskCheckbox
                        taskId={task.id as string}
                        projectId={project.id as string}
                        completed={!!task.completed}
                        action={toggleTaskCompletedAction}
                      />
                    </td>
                    <td
                      className={`px-4 py-3 align-top text-base font-medium ${
                        task.completed
                          ? 'text-slate-500 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {task.activity}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {task.priority ? (
                        <PriorityBadge priority={task.priority as Priority} />
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {task.deliverable ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {currentAssignees.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {currentAssignees.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                            >
                              {p.name ?? p.email.split('@')[0]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-slate-500">
                      {task.start_date && task.due_date
                        ? `${task.start_date} → ${task.due_date}`
                        : task.due_date
                          ? `Due ${task.due_date}`
                          : '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">
                      <div className="flex flex-col gap-1">
                        {task.is_meeting && <Tag>MTG</Tag>}
                        {task.is_onsite && <Tag>On-site</Tag>}
                        {task.is_translation && <Tag>Translation</Tag>}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Link
                        href={`/projects/${project.id}/tasks/${task.id}/edit`}
                        className="text-sm text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </Link>
                      <form action={deleteTaskAction} className="ml-3 inline">
                        <input type="hidden" name="id" value={task.id} />
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <button
                          type="submit"
                          className="text-sm text-rose-600 hover:text-rose-800"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-base text-slate-500">
          No tasks yet. Add one below.
        </p>
      )}

    </div>
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

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
      {children}
    </span>
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
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  )
}
