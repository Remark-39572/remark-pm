import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { isJpHoliday, jpHolidayName } from '@/lib/jp-holidays'


export const dynamic = 'force-dynamic'

type ResourcesSearchParams = {
  start?: string
  days?: string
  showCompleted?: string
}

const DEFAULT_DAYS = 21

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<ResourcesSearchParams>
}) {
  const params = await searchParams
  const startStr = params.start || todayISO()
  const days = clampInt(params.days, 7, 60, DEFAULT_DAYS)
  const showCompleted = params.showCompleted === '1'

  const startDate = parseISO(startStr) ?? new Date()
  const dateList = Array.from({ length: days }, (_, i) => addDays(startDate, i))
  const startISO = formatISO(dateList[0])
  const endISO = formatISO(dateList[dateList.length - 1])

  const supabase = await createClient()

  const { data: people } = await supabase
    .from('people')
    .select('id, name, email')
    .eq('is_resource', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true, nullsFirst: false })

  const { data: tasksRaw } = await supabase
    .from('tasks')
    .select(
      'id, activity, start_date, due_date, completed, project:projects(id, name, deleted_at, client:clients(name, deleted_at)), task_assignees(person_id)',
    )
    .is('deleted_at', null)
    .not('start_date', 'is', null)
    .not('due_date', 'is', null)
    .lte('start_date', endISO)
    .gte('due_date', startISO)

  const filteredTasks = (tasksRaw ?? [])
    .filter((t) => {
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
    .filter((t) => showCompleted || !t.completed)

  type TaskRow = (typeof filteredTasks)[number]

  const tasksByPersonDay = new Map<string, TaskRow[]>()
  for (const t of filteredTasks) {
    const personIds = (t.task_assignees ?? []).map(
      (ta: { person_id: string }) => ta.person_id,
    )
    if (personIds.length === 0) continue
    for (const personId of personIds) {
      for (const day of dateList) {
        const dayISO = formatISO(day)
        if ((t.start_date as string) <= dayISO && dayISO <= (t.due_date as string)) {
          const key = `${personId}|${dayISO}`
          const arr = tasksByPersonDay.get(key) ?? []
          arr.push(t)
          tasksByPersonDay.set(key, arr)
        }
      }
    }
  }

  const prevStart = formatISO(addDays(startDate, -days))
  const nextStart = formatISO(addDays(startDate, days))
  const todayHref = `/resources?days=${days}${showCompleted ? '&showCompleted=1' : ''}`

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Resources
        </h1>
        <p className="mt-1 text-base text-slate-500">
          Who is working on what each day. Click a task to jump to its project.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/resources?start=${prevStart}&days=${days}${showCompleted ? '&showCompleted=1' : ''}`}
            className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            ← Prev
          </Link>
          <Link
            href={todayHref}
            className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Today
          </Link>
          <Link
            href={`/resources?start=${nextStart}&days=${days}${showCompleted ? '&showCompleted=1' : ''}`}
            className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Next →
          </Link>
          <form action="/resources" method="get" className="flex items-center gap-2">
            <input type="hidden" name="start" value={startISO} />
            <select
              name="days"
              defaultValue={String(days)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="21">21 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                name="showCompleted"
                value="1"
                defaultChecked={showCompleted}
              />
              Completed
            </label>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {(people ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No resource members yet. Mark people as Resource on the People page.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Person
                </th>
                {dateList.map((d) => {
                  const iso = formatISO(d)
                  const holiday = isJpHoliday(iso)
                  return (
                    <th
                      key={iso}
                      title={jpHolidayName(iso) ?? undefined}
                      className={`min-w-[120px] border-l border-slate-100 px-2 py-3 text-left text-xs font-medium ${
                        holiday
                          ? 'bg-rose-50 text-rose-700'
                          : isWeekend(d)
                            ? 'bg-slate-100 text-slate-400'
                            : 'text-slate-600'
                      } ${isToday(d) ? 'bg-amber-50 text-amber-900' : ''}`}
                    >
                      <div>{formatHeader(d)}</div>
                      <div className="text-[10px] uppercase">{weekday(d)}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(people ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                    {p.name ?? p.email.split('@')[0]}
                  </td>
                  {dateList.map((d) => {
                    const iso = formatISO(d)
                    const key = `${p.id}|${iso}`
                    const cellTasks = tasksByPersonDay.get(key) ?? []
                    const holiday = isJpHoliday(iso)
                    return (
                      <td
                        key={key}
                        title={jpHolidayName(iso) ?? undefined}
                        className={`min-w-[120px] border-l border-slate-100 align-top px-2 py-2 ${
                          holiday
                            ? 'bg-rose-50'
                            : isWeekend(d)
                              ? 'bg-slate-50'
                              : ''
                        } ${isToday(d) ? 'bg-amber-50' : ''}`}
                      >
                        <div className="flex flex-col gap-1">
                          {cellTasks.map((t) => {
                            const project = Array.isArray(t.project)
                              ? t.project[0]
                              : t.project
                            const client = project
                              ? Array.isArray(project.client)
                                ? project.client[0]
                                : project.client
                              : null
                            return (
                              <Link
                                key={t.id as string}
                                href={`/projects/${project?.id ?? ''}`}
                                className={`block rounded px-1.5 py-1 text-xs ${
                                  t.completed
                                    ? 'bg-slate-100 text-slate-500 line-through'
                                    : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
                                }`}
                                title={`${client?.name ?? ''} · ${project?.name ?? ''} — ${t.activity}`}
                              >
                                <div className="truncate font-medium">
                                  {t.activity as string}
                                </div>
                                {client && (
                                  <div className="truncate text-[10px] font-semibold text-slate-600">
                                    {client.name}
                                  </div>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function todayISO(): string {
  return formatISO(new Date())
}

function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}

function formatISO(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isWeekend(d: Date): boolean {
  const w = d.getDay()
  return w === 0 || w === 6
}

function isToday(d: Date): boolean {
  return formatISO(d) === formatISO(new Date())
}

function formatHeader(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function weekday(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
}

function clampInt(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = v ? parseInt(v, 10) : NaN
  if (isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
