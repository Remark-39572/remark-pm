import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TaskForm from '../../task-form'
import { type Person, type Priority } from '@/lib/types'

async function updateTaskAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const project_id = formData.get('project_id') as string
  const activity = (formData.get('activity') as string)?.trim()
  const start_date = (formData.get('start_date') as string) || null
  const due_date = (formData.get('due_date') as string) || null
  if (!id || !project_id || !activity || !start_date || !due_date) return

  const priority = ((formData.get('priority') as string) || '') as Priority | ''
  const deliverable =
    ((formData.get('deliverable') as string) || '').trim() || null
  const note = ((formData.get('note') as string) || '').trim() || null
  const is_meeting = formData.get('is_meeting') === 'on'
  const is_onsite = formData.get('is_onsite') === 'on'
  const is_translation = formData.get('is_translation') === 'on'
  const assignee_ids = formData.getAll('assignee_ids') as string[]

  const supabase = await createClient()
  await supabase
    .from('tasks')
    .update({
      activity,
      priority: priority || null,
      deliverable,
      start_date,
      due_date,
      note,
      is_meeting,
      is_onsite,
      is_translation,
    })
    .eq('id', id)

  await supabase.from('task_assignees').delete().eq('task_id', id)
  if (assignee_ids.length > 0) {
    await supabase
      .from('task_assignees')
      .insert(assignee_ids.map((person_id) => ({ task_id: id, person_id })))
  }

  redirect(`/projects/${project_id}`)
}

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id, taskId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!project) notFound()

  const { data: task } = await supabase
    .from('tasks')
    .select('*, task_assignees(person_id)')
    .eq('id', taskId)
    .eq('project_id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!task) notFound()

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .eq('is_resource', true)
    .is('deleted_at', null)
    .order('name', { ascending: true, nullsFirst: false })

  const assigneeIds = (task.task_assignees ?? []).map(
    (ta: { person_id: string }) => ta.person_id,
  )

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3 text-base">
        <Link href="/projects" className="text-slate-500 hover:text-slate-900">
          Projects
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/projects/${project.id}`}
          className="text-slate-500 hover:text-slate-900"
        >
          {project.name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-medium text-slate-900">Edit task</span>
      </div>

      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-slate-900">
        Edit task
      </h1>

      <TaskForm
        action={updateTaskAction}
        projectId={project.id}
        taskId={task.id as string}
        assignablePeople={(people ?? []) as Person[]}
        cancelHref={`/projects/${project.id}`}
        submitLabel="Save changes"
        initial={{
          activity: task.activity as string,
          priority: (task.priority as Priority | null) ?? null,
          deliverable: (task.deliverable as string | null) ?? null,
          start_date: (task.start_date as string | null) ?? null,
          due_date: (task.due_date as string | null) ?? null,
          note: (task.note as string | null) ?? null,
          is_meeting: !!task.is_meeting,
          is_onsite: !!task.is_onsite,
          is_translation: !!task.is_translation,
          assigneeIds,
        }}
      />
    </div>
  )
}
