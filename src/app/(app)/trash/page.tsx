import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { revalidateAggregates } from '@/lib/revalidate'


export const dynamic = 'force-dynamic'

type ResourceType = 'project' | 'task' | 'client' | 'person'

async function restoreAction(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const type = formData.get('type') as ResourceType
  if (!id || !type) return

  const supabase = await createClient()
  const table = tableFor(type)
  await supabase.from(table).update({ deleted_at: null }).eq('id', id)
  revalidatePath('/trash')
  if (type === 'project') revalidatePath('/projects')
  if (type === 'client') revalidatePath('/clients')
  if (type === 'person') revalidatePath('/people')
  if (type === 'task') {
    const { data } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', id)
      .maybeSingle()
    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`)
  }
  revalidateAggregates()
}

function tableFor(type: ResourceType): string {
  switch (type) {
    case 'project':
      return 'projects'
    case 'task':
      return 'tasks'
    case 'client':
      return 'clients'
    case 'person':
      return 'people'
  }
}

export default async function TrashPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('people')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdminOrHigher = me?.role === 'owner' || me?.role === 'admin'
  if (!isAdminOrHigher) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Trash</h1>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Only admin and owner can access the trash.
        </p>
      </div>
    )
  }

  const [projectsRes, tasksRes, clientsRes, peopleRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*, project:projects(id, name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('clients')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('people')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const projects = projectsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const clients = clientsRes.data ?? []
  const people = peopleRes.data ?? []

  const total = projects.length + tasks.length + clients.length + people.length

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Trash
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Recently deleted items. Restore anything you removed by accident.
          </p>
        </div>
        <p className="text-base text-slate-500">{total} items</p>
      </div>

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          The trash is empty.
        </p>
      ) : (
        <div className="space-y-6">
          {projects.length > 0 && (
            <Section title={`Projects (${projects.length})`}>
              {projects.map((p) => {
                const client = Array.isArray(p.client) ? p.client[0] : p.client
                return (
                  <Row
                    key={p.id}
                    id={p.id as string}
                    type="project"
                    title={p.name as string}
                    subtitle={client?.name ?? 'No client'}
                    deletedAt={p.deleted_at as string}
                  />
                )
              })}
            </Section>
          )}

          {tasks.length > 0 && (
            <Section title={`Tasks (${tasks.length})`}>
              {tasks.map((t) => {
                const project = Array.isArray(t.project) ? t.project[0] : t.project
                return (
                  <Row
                    key={t.id}
                    id={t.id as string}
                    type="task"
                    title={t.activity as string}
                    subtitle={project?.name ?? '—'}
                    deletedAt={t.deleted_at as string}
                  />
                )
              })}
            </Section>
          )}

          {clients.length > 0 && (
            <Section title={`Clients (${clients.length})`}>
              {clients.map((c) => (
                <Row
                  key={c.id}
                  id={c.id as string}
                  type="client"
                  title={c.name as string}
                  deletedAt={c.deleted_at as string}
                />
              ))}
            </Section>
          )}

          {people.length > 0 && (
            <Section title={`People (${people.length})`}>
              {people.map((p) => (
                <Row
                  key={p.id}
                  id={p.id as string}
                  type="person"
                  title={(p.name as string) ?? (p.email as string)}
                  subtitle={p.email as string}
                  deletedAt={p.deleted_at as string}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )

  function Section({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
          {title}
        </h2>
        <ul className="divide-y divide-slate-100">{children}</ul>
      </div>
    )
  }

  function Row({
    id,
    type,
    title,
    subtitle,
    deletedAt,
  }: {
    id: string
    type: ResourceType
    title: string
    subtitle?: string
    deletedAt: string
  }) {
    return (
      <li className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          <p className="truncate text-xs text-slate-500">
            {subtitle ? `${subtitle} · ` : ''}deleted {formatRelative(deletedAt)}
          </p>
        </div>
        <form action={restoreAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="type" value={type} />
          <button
            type="submit"
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Restore
          </button>
        </form>
      </li>
    )
  }
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days}d ago`
  return d.toISOString().slice(0, 10)
}
