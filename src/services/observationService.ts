import { createClient } from '@/lib/supabase/client'
import type { ProjectObservation } from '@/types'

export async function fetchProjectObservations(projectId: string): Promise<ProjectObservation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_observations')
    .select('*')
    .eq('project_id', projectId)
    .order('observed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProjectObservation(
  obs: Omit<ProjectObservation, 'id' | 'created_at'>
): Promise<ProjectObservation> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_observations')
    .insert(obs)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProjectObservation(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_observations').delete().eq('id', id)
  if (error) throw error
}
