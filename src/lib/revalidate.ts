import { revalidatePath } from 'next/cache'

// Pages that cross-cut tasks / projects / clients / people.
// Call this after any mutation that affects what appears anywhere.
export function revalidateAggregates() {
  revalidatePath('/timeline')
  revalidatePath('/resources')
  revalidatePath('/projects')
  revalidatePath('/projects/[id]', 'page')
  revalidatePath('/projects/[id]/timeline', 'page')
  revalidatePath('/clients')
  revalidatePath('/clients/[id]', 'page')
  revalidatePath('/people')
  revalidatePath('/trash')
}
