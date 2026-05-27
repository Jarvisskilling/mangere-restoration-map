import { createClient } from '@/lib/supabase/client'
import type { ProjectEvent, CommunityEvent } from '@/types'

// ── Project events ─────────────────────────────────────────────

export async function fetchProjectEvents(projectId: string): Promise<ProjectEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_events')
    .select('*')
    .eq('project_id', projectId)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createProjectEvent(
  event: Omit<ProjectEvent, 'id' | 'created_at'>
): Promise<ProjectEvent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_events')
    .insert(event)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProjectEvent(
  id: string,
  updates: Partial<Omit<ProjectEvent, 'id' | 'created_at' | 'created_by'>>
): Promise<ProjectEvent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProjectEvent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_events').delete().eq('id', id)
  if (error) throw error
}

// ── Community events ───────────────────────────────────────────

export async function fetchCommunityEvents(): Promise<CommunityEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .order('start_date', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createCommunityEvent(
  event: Omit<CommunityEvent, 'id' | 'created_at'>
): Promise<CommunityEvent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('community_events')
    .insert(event)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCommunityEvent(
  id: string,
  updates: Partial<Omit<CommunityEvent, 'id' | 'created_at' | 'created_by'>>
): Promise<CommunityEvent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('community_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCommunityEvent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('community_events').delete().eq('id', id)
  if (error) throw error
}
