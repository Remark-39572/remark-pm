'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function reorderClients(orderedIds: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reorder_clients', {
    ordered_ids: orderedIds,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  revalidatePath('/timeline')
}

export async function reorderPeople(orderedIds: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reorder_people', {
    ordered_ids: orderedIds,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/people')
  revalidatePath('/timeline')
  revalidatePath('/resources')
}
