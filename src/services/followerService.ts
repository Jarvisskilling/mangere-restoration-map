import { createClient } from '@/lib/supabase/client'

export async function fetchFollowerCount(projectId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('project_followers')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  return count ?? 0
}

export async function checkIsFollowing(projectId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('project_followers')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function followProject(projectId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_followers')
    .insert({ project_id: projectId, user_id: userId })
  if (error) throw error
}

export async function unfollowProject(projectId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_followers')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw error
}
