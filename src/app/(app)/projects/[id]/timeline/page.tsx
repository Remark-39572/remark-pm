import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import TeamGantt, {
  type GanttTaskRow,
  type GanttPerson,
} from '@/app/_components/team-gantt'
import { STATUS_LABELS, type Priority, type ProjectStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function updateTaskDatesAction(
  taskId: string,
  start: string,
  end: string,
) {
  'use server'
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .maybeSingle()
  await supabase
    .from('tasks')
    .update({ start_date: start, due_date: end })
    .eq('id', taskId)
  if (task?.project_id) {
    revalidatePath(`/projects/${task.project_id}`)
    revalidatePath(`/projects/${task.project_id}/timeline`)
  }
  revalidatePath('/timeline')
  revalidatePath('/resources')
}

export default async function ProjectTimelinePage({
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
    .select(
      'id, activity, start_date, due_date, completed, priority, task_assignees(person:people(id, name, email, avatar_url))',
    )
    .eq('project_id', id)
    .is('deleted_at', null)
    .not('start_date', 'is', null)
    .not('due_date', 'is', null)
    .order('created_at', { ascending: true })

  const { data: people } = await supabase
    .from('people')
    .select('id, name, email, avatar_url')
    .eq('is_resource', true)
    .is('deleted_at', null)
    .order('name', { ascending: true, nullsFirst: false })

  const resourcePeople: GanttPerson[] = (people ?? []).map((p) => ({
    id: p.id as string,
    name: (p.name as string | null) ?? null,
    email: p.email as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }))

  const clientObj = Array.isArray(project.client)
    ? project.client[0]
    : project.client
  const clientId = (clientObj?.id as string | undefined) ?? '__no_client__'
  const clientName = (clientObj?.name as string | undefined) ?? 'No client'
  const clientCode = (clientObj?.code as string | null | undefined) ?? null

  const ganttTasks: GanttTaskRow[] = (tasks ?? []).map((t) => ({
    id: t.id as string,
    activity: t.activity as string,
    start: t.start_date as string,
    end: t.due_date as string,
    completed: !!t.completed,
    priority: (t.priority as Priority | null) ?? null,
    assignees: ((t.task_assignees ?? []) as unknown as {
      person:
        | {
            id: string
            name: string | null
            email: string
            avatar_url: string | null
          }
        | {
            id: string
            name: string | null
            email: string
            avatar_url: string | null
          }[]
        | null
    }[])
      .map((ta) => (Array.isArray(ta.person) ? ta.person[0] : ta.person))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        email: p!.email,
        avatarUrl: p!.avatar_url,
      })),
    projectId: project.id as string,
    projectName: project.name as string,
    clientId,
    clientName,
    clientCode,
  }))

  return (
    <div>
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
        <span className="font-medium text-slate-900">Timeline</span>
      </div>

      <div className="mb-6 flex items-start justify-between">
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
        <Link
          href={`/projects/${project.id}`}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          ← Tasks
        </Link>
      </div>

      <TeamGantt
        tasks={ganttTasks}
        groupByProject={false}
        resourcePeople={resourcePeople}
        onTaskDateChange={updateTaskDatesAction}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    on_hold: 'bg-amber-100 text-amber-800',
    completed: 'bg-slate-100 text-slate-700',
    other: 'bg-sky-100 text-sky-800',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
