import { createClient } from '@/lib/supabase/client'
import type { Statistics } from '@/types'

export async function fetchStatistics(): Promise<Statistics | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('statistics')
    .select('*')
    .single()

  if (error) return null
  return data
}

export async function fetchProjectStory(projectId: string): Promise<{ content: string; updated_at: string } | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('project_stories')
    .select('content, updated_at')
    .eq('project_id', projectId)
    .single()
  return data as { content: string; updated_at: string } | null
}

export async function upsertProjectStory(
  projectId: string,
  content: string,
  userId: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_stories')
    .upsert(
      { project_id: projectId, content, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
