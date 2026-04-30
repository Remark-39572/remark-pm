'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  type Priority,
} from '@/lib/types'
import { isJpHoliday, jpHolidayName } from '@/lib/jp-holidays'

export type GanttPerson = {
  id: string
  name: string | null
  email: string
  avatarUrl?: string | null
}

export type GanttTaskRow = {
  id: string
  activity: string
  start: string
  end: string
  completed: boolean
  priority: Priority | null
  assignees: GanttPerson[]
  projectId: string
  projectName: string
  clientId: string
  clientName: string
}

type ViewMode = 'Day' | 'Week' | 'Month'

const DAY_WIDTHS: Record<ViewMode, number> = {
  Day: 44,
  Week: 18,
  Month: 6,
}

const ROW_HEIGHT = 44
const PROJECT_HEADER_HEIGHT = 32
const CLIENT_HEADER_HEIGHT = 40
const HEATMAP_ROW_HEIGHT = 28

const PROJECT_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-pink-500',
]

type Props = {
  tasks: GanttTaskRow[]
  groupByProject?: boolean
  resourcePeople?: GanttPerson[]
  onTaskDateChange?: (
    taskId: string,
    start: string,
    end: string,
  ) => Promise<void>
}

type DragRef = {
  taskId: string
  mode: 'move' | 'resize-left' | 'resize-right'
  startX: number
  origStart: Date
  origEnd: Date
  origLeft: number
  origWidth: number
  barEl: HTMLDivElement
}

export default function TeamGantt({
  tasks,
  groupByProject = true,
  resourcePeople = [],
  onTaskDateChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('Day')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [, startTransition] = useTransition()
  const dragRef = useRef<DragRef | null>(null)

  // Distinct options derived from all tasks
  const filterOptions = useMemo(() => {
    const clients = new Map<string, string>()
    const projects = new Map<string, string>()
    const assignees = new Map<string, string>()
    for (const t of tasks) {
      if (t.clientId) clients.set(t.clientId, t.clientName)
      projects.set(t.projectId, t.projectName)
      for (const a of t.assignees) {
        assignees.set(a.id, a.name ?? a.email.split('@')[0])
      }
    }
    return {
      clients: Array.from(clients.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
      projects: Array.from(projects.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
      assignees: Array.from(assignees.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    }
  }, [tasks])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (hideCompleted && t.completed) return false
      if (q && !t.activity.toLowerCase().includes(q)) return false
      if (filterClient && t.clientId !== filterClient) return false
      if (filterProject && t.projectId !== filterProject) return false
      if (filterAssignee && !t.assignees.some((a) => a.id === filterAssignee))
        return false
      if (filterPriority && t.priority !== filterPriority) return false
      return true
    })
  }, [
    tasks,
    hideCompleted,
    search,
    filterClient,
    filterProject,
    filterAssignee,
    filterPriority,
  ])

  const hasActiveFilter =
    !!search ||
    !!filterClient ||
    !!filterProject ||
    !!filterAssignee ||
    !!filterPriority ||
    hideCompleted

  function clearFilters() {
    setSearch('')
    setFilterClient('')
    setFilterProject('')
    setFilterAssignee('')
    setFilterPriority('')
    setHideCompleted(false)
  }

  const { dateList, minDate } = useMemo(() => {
    if (visible.length === 0) {
      const today = new Date()
      const start = addDays(today, -3)
      const list = Array.from({ length: 28 }, (_, i) => addDays(start, i))
      return { dateList: list, minDate: start }
    }
    const allDates = visible.flatMap((t) => [parseDate(t.start), parseDate(t.end)])
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())))
    const start = addDays(min, -7)
    const end = addDays(max, 14)
    const days = Math.max(
      28,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    )
    const list = Array.from({ length: days }, (_, i) => addDays(start, i))
    return { dateList: list, minDate: start }
  }, [visible])

  const dayWidth = DAY_WIDTHS[viewMode]
  const totalWidth = dateList.length * dayWidth

  const projectColor = useMemo(() => {
    const map = new Map<string, string>()
    let idx = 0
    for (const t of visible) {
      if (!map.has(t.projectId)) {
        map.set(t.projectId, PROJECT_COLORS[idx % PROJECT_COLORS.length])
        idx++
      }
    }
    return map
  }, [visible])

  const grouped = useMemo(() => {
    if (!groupByProject) {
      return [
        {
          clientId: '',
          clientName: '',
          projects: [{ projectId: '', projectName: '', tasks: visible }],
        },
      ]
    }
    type ProjectGroup = { projectName: string; tasks: GanttTaskRow[] }
    type ClientGroup = {
      clientName: string
      projects: Map<string, ProjectGroup>
    }
    const byClient = new Map<string, ClientGroup>()
    for (const t of visible) {
      const clientGroup = byClient.get(t.clientId) ?? {
        clientName: t.clientName,
        projects: new Map<string, ProjectGroup>(),
      }
      const projectGroup = clientGroup.projects.get(t.projectId) ?? {
        projectName: t.projectName,
        tasks: [],
      }
      projectGroup.tasks.push(t)
      clientGroup.projects.set(t.projectId, projectGroup)
      byClient.set(t.clientId, clientGroup)
    }
    return Array.from(byClient.entries()).map(([clientId, c]) => ({
      clientId,
      clientName: c.clientName,
      projects: Array.from(c.projects.entries()).map(([projectId, p]) => ({
        projectId,
        projectName: p.projectName,
        tasks: p.tasks,
      })),
    }))
  }, [visible, groupByProject])

  // Heatmap: per-person, per-day task count
  const heatmap = useMemo(() => {
    if (resourcePeople.length === 0) return null
    const map = new Map<string, Map<string, number>>()
    for (const p of resourcePeople) map.set(p.id, new Map())
    for (const t of visible) {
      if (t.completed) continue
      for (const p of t.assignees) {
        const personMap = map.get(p.id)
        if (!personMap) continue
        const start = parseDate(t.start)
        const end = parseDate(t.end)
        let cur = new Date(start)
        while (cur <= end) {
          const key = formatISO(cur)
          personMap.set(key, (personMap.get(key) ?? 0) + 1)
          cur = addDays(cur, 1)
        }
      }
    }
    return map
  }, [resourcePeople, visible])

  // Header rows: depend on view mode
  const headerData = useMemo(() => {
    if (viewMode === 'Day') {
      return {
        primary: groupConsecutive(dateList, (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        ).map((g) => ({
          label: formatMonthLabel(g.key),
          days: g.count,
        })),
        secondary: dateList.map((d) => {
          const iso = formatISO(d)
          return {
            short: String(d.getDate()),
            weekday: weekday(d),
            isWeekend: isWeekend(d),
            isHoliday: isJpHoliday(iso),
            holidayName: jpHolidayName(iso),
            isToday: iso === formatISO(new Date()),
            width: dayWidth,
          }
        }),
      }
    }
    if (viewMode === 'Week') {
      // Group by ISO week (Mon-Sun)
      const weekGroups = groupConsecutive(dateList, (d) => weekKey(d))
      return {
        primary: groupConsecutive(dateList, (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        ).map((g) => ({
          label: formatMonthLabel(g.key),
          days: g.count,
        })),
        secondary: weekGroups.map((g) => {
          const first = g.firstDate
          return {
            short: `${first.getMonth() + 1}/${first.getDate()}`,
            weekday: 'Wk',
            isWeekend: false,
            isHoliday: false,
            holidayName: null as string | null,
            isToday: false,
            width: g.count * dayWidth,
          }
        }),
      }
    }
    // Month
    const monthGroups = groupConsecutive(dateList, (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    )
    return {
      primary: groupConsecutive(dateList, (d) => String(d.getFullYear())).map(
        (g) => ({
          label: g.key,
          days: g.count,
        }),
      ),
      secondary: monthGroups.map((g) => ({
        short: formatShortMonthLabel(g.key),
        weekday: '',
        isWeekend: false,
        isHoliday: false,
        holidayName: null as string | null,
        isToday: false,
        width: g.count * dayWidth,
      })),
    }
  }, [viewMode, dateList, dayWidth])

  const todayISO = formatISO(new Date())
  const todayIdx = daysBetween(minDate, new Date())

  // Drag handling — direct DOM mutation for smooth performance
  useEffect(() => {
    let rafId: number | null = null
    let pendingEvent: MouseEvent | null = null

    function applyDrag() {
      rafId = null
      const drag = dragRef.current
      if (!drag || !pendingEvent) return
      const dx = pendingEvent.clientX - drag.startX
      const snappedDx = Math.round(dx / dayWidth) * dayWidth
      if (drag.mode === 'move') {
        drag.barEl.style.left = `${drag.origLeft + snappedDx}px`
      } else if (drag.mode === 'resize-left') {
        const newLeft = drag.origLeft + snappedDx
        const newWidth = drag.origWidth - snappedDx
        if (newWidth >= dayWidth) {
          drag.barEl.style.left = `${newLeft}px`
          drag.barEl.style.width = `${newWidth}px`
        }
      } else {
        const newWidth = drag.origWidth + snappedDx
        if (newWidth >= dayWidth) {
          drag.barEl.style.width = `${newWidth}px`
        }
      }
    }

    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      pendingEvent = e
      if (rafId === null) {
        rafId = requestAnimationFrame(applyDrag)
      }
    }

    function onUp() {
      if (rafId !== null) cancelAnimationFrame(rafId)
      const drag = dragRef.current
      if (!drag) return
      const finalLeft = parseFloat(drag.barEl.style.left || `${drag.origLeft}`)
      const finalWidth = parseFloat(drag.barEl.style.width || `${drag.origWidth}`)
      const startDelta = Math.round((finalLeft - drag.origLeft) / dayWidth)
      const widthDelta = Math.round((finalWidth - drag.origWidth) / dayWidth)
      let newStart = drag.origStart
      let newEnd = drag.origEnd
      if (drag.mode === 'move') {
        newStart = addDays(drag.origStart, startDelta)
        newEnd = addDays(drag.origEnd, startDelta)
      } else if (drag.mode === 'resize-left') {
        newStart = addDays(drag.origStart, startDelta)
      } else {
        newEnd = addDays(drag.origEnd, widthDelta)
      }
      dragRef.current = null
      document.body.style.cursor = ''
      if (newEnd >= newStart && onTaskDateChange) {
        const startStr = formatISO(newStart)
        const endStr = formatISO(newEnd)
        // Only fire if dates actually changed
        if (
          startStr !== formatISO(drag.origStart) ||
          endStr !== formatISO(drag.origEnd)
        ) {
          startTransition(() => {
            onTaskDateChange(drag.taskId, startStr, endStr)
          })
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [dayWidth, onTaskDateChange])

  function startDrag(
    e: React.MouseEvent<HTMLElement>,
    task: GanttTaskRow,
    mode: 'move' | 'resize-left' | 'resize-right',
  ) {
    if (!onTaskDateChange) return
    e.preventDefault()
    e.stopPropagation()
    const barEl = (e.currentTarget.closest('[data-bar]') ??
      e.currentTarget) as HTMLDivElement
    if (!barEl) return
    dragRef.current = {
      taskId: task.id,
      mode,
      startX: e.clientX,
      origStart: parseDate(task.start),
      origEnd: parseDate(task.end),
      origLeft: parseFloat(barEl.style.left || '0'),
      origWidth: parseFloat(barEl.style.width || '0'),
      barEl,
    }
    document.body.style.cursor =
      mode === 'move' ? 'grabbing' : 'ew-resize'
  }

  const rightScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to today on mount
  useEffect(() => {
    if (rightScrollRef.current && todayIdx >= 0) {
      rightScrollRef.current.scrollLeft = Math.max(
        0,
        todayIdx * dayWidth - 200,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          {(['Day', 'Week', 'Month'] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                viewMode === m
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {groupByProject && filterOptions.clients.length > 0 && (
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All clients</option>
              {filterOptions.clients.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          {groupByProject && filterOptions.projects.length > 0 && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All projects</option>
              {filterOptions.projects.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          {filterOptions.assignees.length > 0 && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All assignees</option>
              {filterOptions.assignees.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            Hide completed
          </label>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-12 text-center text-base text-slate-500">
          No tasks with both start and due dates yet.
        </p>
      ) : (
        <div
          ref={rightScrollRef}
          className="relative max-h-[calc(100vh-260px)] overflow-auto"
        >
        <div className="flex" style={{ minWidth: 420 + totalWidth }}>
          {/* Left panel */}
          <div className="sticky left-0 z-20 w-[420px] flex-shrink-0 border-r border-slate-200 bg-white">
            {/* Header */}
            <div
              className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50"
              style={{ height: 60 }}
            >
              <div className="grid h-full grid-cols-[1fr_120px_60px] items-center px-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                <div>Task</div>
                <div>Assigned</div>
                <div className="text-right">Priority</div>
              </div>
            </div>

            {grouped.map((clientGroup) => (
              <div key={clientGroup.clientId}>
                {groupByProject && clientGroup.clientName && (
                  <div
                    className="flex items-center border-b border-slate-200 bg-slate-200 px-4 text-sm font-bold uppercase tracking-wide text-slate-800"
                    style={{ height: CLIENT_HEADER_HEIGHT }}
                  >
                    {clientGroup.clientName}
                  </div>
                )}
                {clientGroup.projects.map((projectGroup) => (
                  <div key={projectGroup.projectId}>
                    {groupByProject && projectGroup.projectName && (
                      <div
                        className="flex items-center bg-slate-50 px-4 text-sm font-semibold text-slate-700"
                        style={{ height: PROJECT_HEADER_HEIGHT }}
                      >
                        <span
                          className={`mr-2 inline-block h-3 w-3 rounded-full ${
                            projectColor.get(projectGroup.projectId) ?? 'bg-slate-400'
                          }`}
                        />
                        {projectGroup.projectName}
                      </div>
                    )}
                    {projectGroup.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="grid grid-cols-[1fr_120px_60px] items-center border-b border-slate-100 px-4 hover:bg-slate-50"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <Link
                          href={`/projects/${t.projectId}/tasks/${t.id}/edit`}
                          className={`truncate pr-2 text-sm ${
                            t.completed
                              ? 'text-slate-500 line-through'
                              : 'font-medium text-slate-900 hover:text-indigo-600'
                          }`}
                          title={t.activity}
                        >
                          {t.activity}
                        </Link>
                        <div className="flex flex-wrap gap-0.5 overflow-hidden">
                          {t.assignees.slice(0, 3).map((p) => (
                            <Avatar key={p.id} person={p} size={24} />
                          ))}
                          {t.assignees.length > 3 && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                              +{t.assignees.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {t.priority && (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[t.priority]}`}
                            >
                              {PRIORITY_LABELS[t.priority]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* Heatmap left labels */}
            {heatmap && resourcePeople.length > 0 && (
              <div className="border-t-2 border-slate-300">
                <div
                  className="flex items-center bg-slate-100 px-4 text-xs font-semibold uppercase tracking-wider text-slate-600"
                  style={{ height: PROJECT_HEADER_HEIGHT }}
                >
                  Workload
                </div>
                {resourcePeople.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 border-b border-slate-100 px-4 text-sm text-slate-700"
                    style={{ height: HEATMAP_ROW_HEIGHT }}
                  >
                    <Avatar person={p} size={20} />
                    {p.name ?? p.email.split('@')[0]}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right timeline (horizontal scroll handled by outer container) */}
          <div className="flex-1">
            <div style={{ width: totalWidth, position: 'relative' }}>
              {/* Header */}
              <div
                className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50"
                style={{ height: 60 }}
              >
                {/* Primary row */}
                <div
                  className="flex border-b border-slate-200"
                  style={{ height: 30 }}
                >
                  {headerData.primary.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center border-r border-slate-200 px-2 text-xs font-semibold text-slate-700"
                      style={{ width: m.days * dayWidth }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                {/* Secondary row */}
                <div className="flex" style={{ height: 30 }}>
                  {headerData.secondary.map((c, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r border-slate-100 text-[10px] ${
                        c.isHoliday
                          ? 'bg-rose-50 text-rose-700'
                          : c.isWeekend
                            ? 'bg-slate-100 text-slate-400'
                            : 'text-slate-500'
                      } ${c.isToday ? 'bg-amber-100 text-amber-900 font-semibold' : ''}`}
                      style={{ width: c.width }}
                      title={c.holidayName ?? undefined}
                    >
                      <div className="font-medium">{c.short}</div>
                      {c.weekday && c.width >= 18 && (
                        <div className="text-[9px] uppercase">{c.weekday}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              {grouped.map((clientGroup) => (
                <div key={clientGroup.clientId}>
                  {groupByProject && clientGroup.clientName && (
                    <div
                      className="border-b border-slate-200 bg-slate-200"
                      style={{
                        height: CLIENT_HEADER_HEIGHT,
                        position: 'relative',
                      }}
                    >
                      <DayGrid
                        dateList={dateList}
                        dayWidth={dayWidth}
                        todayISO={todayISO}
                        muted
                      />
                    </div>
                  )}
                  {clientGroup.projects.map((projectGroup) => (
                    <div key={projectGroup.projectId}>
                      {groupByProject && projectGroup.projectName && (
                        <div
                          className="border-b border-slate-100 bg-slate-50"
                          style={{
                            height: PROJECT_HEADER_HEIGHT,
                            position: 'relative',
                          }}
                        >
                          <DayGrid
                            dateList={dateList}
                            dayWidth={dayWidth}
                            todayISO={todayISO}
                            muted
                          />
                        </div>
                      )}
                      {projectGroup.tasks.map((t) => {
                        const startDate = parseDate(t.start)
                        const endDate = parseDate(t.end)
                        const startIdx = daysBetween(minDate, startDate)
                        const endIdx = daysBetween(minDate, endDate)
                        const left = startIdx * dayWidth
                        const width = Math.max(
                          dayWidth,
                          (endIdx - startIdx + 1) * dayWidth,
                        )
                        const color =
                          projectColor.get(t.projectId) ?? 'bg-indigo-500'
                        const canDrag = !!onTaskDateChange
                        return (
                          <div
                            key={t.id}
                            className="relative border-b border-slate-100"
                            style={{ height: ROW_HEIGHT }}
                          >
                            <DayGrid
                              dateList={dateList}
                              dayWidth={dayWidth}
                              todayISO={todayISO}
                            />
                            {/* Bar */}
                            <div
                              data-bar="true"
                              className={`group absolute top-1/2 flex -translate-y-1/2 items-center overflow-visible rounded-md px-2 text-xs font-medium text-white shadow-sm ${color} ${
                                t.completed ? 'opacity-50' : ''
                              } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                              style={{
                                left,
                                width,
                                height: 26,
                              }}
                              title={`${t.activity} (${t.start} → ${t.end})`}
                              onMouseDown={(e) => {
                                if (!canDrag) return
                                const target = e.target as HTMLElement
                                if (target.dataset.handle) return
                                startDrag(e, t, 'move')
                              }}
                            >
                              {canDrag && (
                                <>
                                  <span
                                    data-handle="left"
                                    className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/20 opacity-0 group-hover:opacity-100"
                                    onMouseDown={(e) => startDrag(e, t, 'resize-left')}
                                  />
                                  <span
                                    data-handle="right"
                                    className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/20 opacity-0 group-hover:opacity-100"
                                    onMouseDown={(e) => startDrag(e, t, 'resize-right')}
                                  />
                                </>
                              )}
                              <Link
                                href={`/projects/${t.projectId}/tasks/${t.id}/edit`}
                                className="z-10 truncate"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {dayWidth >= 14 && (
                                  <span className="truncate">
                                    {t.completed ? '✓ ' : ''}
                                    {t.activity}
                                  </span>
                                )}
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}

              {/* Heatmap */}
              {heatmap && resourcePeople.length > 0 && (
                <div className="border-t-2 border-slate-300">
                  <div
                    className="bg-slate-100"
                    style={{
                      height: PROJECT_HEADER_HEIGHT,
                      position: 'relative',
                    }}
                  >
                    <DayGrid
                      dateList={dateList}
                      dayWidth={dayWidth}
                      todayISO={todayISO}
                      muted
                    />
                  </div>
                  {resourcePeople.map((p) => (
                    <div
                      key={p.id}
                      className="relative border-b border-slate-100"
                      style={{ height: HEATMAP_ROW_HEIGHT }}
                    >
                      {dateList.map((d, i) => {
                        const personMap = heatmap.get(p.id)
                        const count = personMap?.get(formatISO(d)) ?? 0
                        const bg = heatmapColor(count)
                        return (
                          <div
                            key={i}
                            className={`absolute top-0 bottom-0 flex items-center justify-center text-[10px] font-medium ${bg}`}
                            style={{
                              left: i * dayWidth,
                              width: dayWidth,
                            }}
                            title={
                              count > 0
                                ? `${count} task${count > 1 ? 's' : ''} on ${formatISO(d)}`
                                : undefined
                            }
                          >
                            {dayWidth >= 18 && count > 0 ? count : ''}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

function DayGrid({
  dateList,
  dayWidth,
  todayISO,
  muted,
}: {
  dateList: Date[]
  dayWidth: number
  todayISO: string
  muted?: boolean
}) {
  return (
    <>
      {dateList.map((d, i) => {
        const iso = formatISO(d)
        const holiday = isJpHoliday(iso)
        const wknd = isWeekend(d)
        let bg = ''
        if (holiday) bg = muted ? 'bg-rose-100' : 'bg-rose-50'
        else if (wknd) bg = muted ? 'bg-slate-100' : 'bg-slate-50'
        if (iso === todayISO) bg = muted ? 'bg-amber-100' : 'bg-amber-50'
        return (
          <div
            key={i}
            className={`absolute top-0 bottom-0 border-r border-slate-100 ${bg}`}
            style={{ left: i * dayWidth, width: dayWidth }}
            title={jpHolidayName(iso) ?? undefined}
          />
        )
      })}
    </>
  )
}

function heatmapColor(count: number): string {
  if (count === 0) return ''
  if (count === 1) return 'bg-emerald-100 text-emerald-800'
  if (count === 2) return 'bg-amber-200 text-amber-900'
  if (count === 3) return 'bg-orange-300 text-orange-900'
  return 'bg-rose-400 text-rose-50'
}

function Avatar({
  person,
  size = 24,
}: {
  person: GanttPerson
  size?: number
}) {
  const label = person.name ?? person.email
  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatarUrl}
        alt={label}
        title={label}
        className="rounded-full object-cover ring-1 ring-white"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 ring-1 ring-white"
      title={label}
      style={{ width: size, height: size }}
    >
      {initials(label)}
    </span>
  )
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
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

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function isWeekend(d: Date): boolean {
  const w = d.getDay()
  return w === 0 || w === 6
}

function weekday(d: Date): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
}

function weekKey(d: Date): string {
  const monday = new Date(d)
  const day = monday.getDay()
  const diff = day === 0 ? -6 : 1 - day
  monday.setDate(monday.getDate() + diff)
  return formatISO(monday)
}

function formatMonthLabel(s: string): string {
  const [y, m] = s.split('-')
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${monthNames[Number(m) - 1]} ${y}`
}

function formatShortMonthLabel(s: string): string {
  const [, m] = s.split('-')
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return monthNames[Number(m) - 1]
}

function initials(s: string): string {
  const parts = s.split(/[\s@]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

function groupConsecutive<T, K>(
  items: T[],
  keyFn: (item: T) => K,
): { key: K; count: number; firstDate: T }[] {
  const groups: { key: K; count: number; firstDate: T }[] = []
  for (const item of items) {
    const key = keyFn(item)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.count += 1
    } else {
      groups.push({ key, count: 1, firstDate: item })
    }
  }
  return groups
}
