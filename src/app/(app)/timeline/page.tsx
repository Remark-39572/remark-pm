import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
import TeamGantt, {
  type GanttTaskRow,
  type GanttPerson,
} from '@/app/_components/team-gantt'
import { type Priority } from '@/lib/types'

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
  const { error } = await supabase
    .from('tasks')
    .update({ start_date: start, due_date: end })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  if (task?.project_id) {
    revalidatePath(`/projects/${task.project_id}`)
    revalidatePath(`/projects/${task.project_id}/timeline`)
  }
  revalidatePath('/timeline')
  revalidatePath('/resources')
}

async function toggleTaskCompletedAction(taskId: string, nextCompleted: boolean) {
  'use server'
  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .maybeSingle()
  const { error } = await supabase
    .from('tasks')
    .update({ completed: nextCompleted })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  if (task?.project_id) {
    revalidatePath(`/projects/${task.project_id}`)
    revalidatePath(`/projects/${task.project_id}/timeline`)
  }
  revalidatePath('/timeline')
}

export default async function GlobalTimelinePage() {
  const supabase = await createClient()

  const { data: tasksRaw } = await supabase
    .from('tasks')
    .select(
      'id, activity, start_date, due_date, completed, priority, project:projects(id, name, deleted_at, client:clients(id, name, code, sort_order, deleted_at)), task_assignees(person:people(id, name, email, avatar_url))',
    )
    .is('deleted_at', null)
    .not('start_date', 'is', null)
    .not('due_date', 'is', null)
    .order('created_at', { ascending: true })

  // Filter out tasks whose parent project or client has been soft-deleted
  // (admin/owner accounts can read deleted rows via RLS, so we filter in code)
  const tasks = (tasksRaw ?? []).filter((t) => {
    const project = Array.isArray(t.project) ? t.project[0] : t.project
    if (!project || project.deleted_at) return false
    const client = project.client
      ? Array.isArray(project.client)
        ? project.client[0]
        : project.client
      : null
    if (client?.deleted_at) return false
    return true
  })

  const { data: people } = await supabase
    .from('people')
    .select('id, name, email, avatar_url')
    .eq('is_resource', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true, nullsFirst: false })

  const resourcePeople: GanttPerson[] = (people ?? []).map((p) => ({
    id: p.id as string,
    name: (p.name as string | null) ?? null,
    email: p.email as string,
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }))

  const ganttTasks: GanttTaskRow[] = (tasks ?? [])
    .map((t) => {
      const project = Array.isArray(t.project) ? t.project[0] : t.project
      if (!project) return null
      const client = Array.isArray(project.client)
        ? project.client[0]
        : project.client
      return {
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
        clientId: (client?.id as string) ?? '__no_client__',
        clientName: (client?.name as string) ?? 'No client',
        clientCode: (client?.code as string | null) ?? null,
        clientSortOrder:
          (client?.sort_order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .filter(Boolean) as GanttTaskRow[]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Timeline
        </h1>
        <p className="mt-1 text-base text-slate-500">
          All tasks across every project, grouped by project. Click any bar or
          task name to edit.
        </p>
      </div>

      <TeamGantt
        tasks={ganttTasks}
        groupByProject={true}
        resourcePeople={resourcePeople}
        onTaskDateChange={updateTaskDatesAction}
        onToggleCompleted={toggleTaskCompletedAction}
      />
    </div>
  )
}
