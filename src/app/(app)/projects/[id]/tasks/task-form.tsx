import Link from 'next/link'
import { PRIORITY_LABELS, type Person, type Priority } from '@/lib/types'

type TaskFormProps = {
  action: (formData: FormData) => Promise<void>
  projectId: string
  assignablePeople: Person[]
  cancelHref: string
  submitLabel: string
  initial?: {
    activity: string
    priority: Priority | null
    deliverable: string | null
    start_date: string | null
    due_date: string | null
    note: string | null
    is_meeting: boolean
    is_onsite: boolean
    is_translation: boolean
    assigneeIds: string[]
  }
  taskId?: string
}

export default function TaskForm({
  action,
  projectId,
  assignablePeople,
  cancelHref,
  submitLabel,
  initial,
  taskId,
}: TaskFormProps) {
  return (
    <form
      action={action}
      className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <input type="hidden" name="project_id" value={projectId} />
      {taskId && <input type="hidden" name="id" value={taskId} />}

      <Field label="Activity" required hint="What needs to be done?">
        <input
          name="activity"
          type="text"
          required
          defaultValue={initial?.activity ?? ''}
          placeholder="e.g. Design homepage hero section"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </Field>

      <div className="grid grid-cols-2 gap-5">
        <Field label="Priority" hint="How urgent is this task?">
          <select
            name="priority"
            defaultValue={initial?.priority ?? ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">— None —</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Deliverable" hint="What output will this produce? (optional)">
          <input
            name="deliverable"
            type="text"
            defaultValue={initial?.deliverable ?? ''}
            placeholder="e.g. Figma file, PDF report"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Field
          label="Start date"
          required
          hint="When does work begin? (required to show on the timeline)"
        >
          <input
            name="start_date"
            type="date"
            lang="en"
            required
            defaultValue={initial?.start_date ?? ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </Field>

        <Field
          label="Due date"
          required
          hint="When must it be finished? (required to show on the timeline)"
        >
          <input
            name="due_date"
            type="date"
            lang="en"
            required
            defaultValue={initial?.due_date ?? ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </Field>
      </div>

      <Field label="Note" hint="Anything else worth remembering?">
        <textarea
          name="note"
          rows={3}
          defaultValue={initial?.note ?? ''}
          placeholder="Context, links, blockers…"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
        />
      </Field>

      <Field label="Tags" hint="Tick anything that applies.">
        <div className="flex flex-wrap gap-4 text-base text-slate-700">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              name="is_meeting"
              defaultChecked={initial?.is_meeting ?? false}
            />
            Meeting
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              name="is_onsite"
              defaultChecked={initial?.is_onsite ?? false}
            />
            On-site
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              name="is_translation"
              defaultChecked={initial?.is_translation ?? false}
            />
            Translation
          </label>
        </div>
      </Field>

      <Field
        label="Assignees"
        hint="Who is responsible? (only resource members shown)"
      >
        {assignablePeople.length === 0 ? (
          <p className="text-sm text-slate-500">
            No resource members yet. Mark someone as Resource on the People
            page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 text-base text-slate-700">
            {assignablePeople.map((p) => (
              <label
                key={p.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="assignee_ids"
                  value={p.id}
                  defaultChecked={initial?.assigneeIds.includes(p.id) ?? false}
                />
                {p.name ?? p.email.split('@')[0]}
              </label>
            ))}
          </div>
        )}
      </Field>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-base font-medium text-white transition hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  )
}
