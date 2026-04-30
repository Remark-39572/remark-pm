import { revalidatePath } from 'next/cache'

// Pages that cross-cut tasks / projects / clients / people.
// Call this after any mutation that affects what appears on the timeline,
// resource view, or trash.
export function revalidateAggregates() {
  revalidatePath('/timeline')
  revalidatePath('/resources')
  revalidatePath('/projects')
  revalidatePath('/projects/[id]/timeline', 'page')
  revalidatePath('/trash')
}
