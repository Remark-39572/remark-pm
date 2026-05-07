'use client'

import { useOptimistic, useTransition } from 'react'

export default function TaskCheckbox({
  taskId,
  projectId,
  completed,
  action,
}: {
  taskId: string
  projectId: string
  completed: boolean
  action: (formData: FormData) => Promise<void>
}) {
  const [optimistic, setOptimistic] = useOptimistic(completed)
  const [, startTransition] = useTransition()

  return (
    <form
      action={async (formData) => {
        startTransition(() => setOptimistic(!optimistic))
        await action(formData)
      }}
    >
      <input type="hidden" name="id" value={taskId} />
      <input type="hidden" name="completed" value={String(optimistic)} />
      <input type="hidden" name="project_id" value={projectId} />
      <button
        type="submit"
        className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
          optimistic
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        aria-label={optimistic ? 'Mark as not done' : 'Mark as done'}
      >
        {optimistic && '✓'}
      </button>
    </form>
  )
}
