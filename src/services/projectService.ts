import { createClient } from '@/lib/supabase/client'
import type { Project, ProjectType } from '@/types'
import { PROJECT_TYPE_DEFAULT_NAMES } from '@/types'

const PROJECT_TYPES: ProjectType[] = ['restoration', 'planting', 'cleanup', 'monitoring', 'education']

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, creator:users(id, email, full_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchProject(id: string): Promise<Project | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, creator:users(id, email, full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function ensureUserProfile(userId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').upsert({
    id: userId,
    email: user.email ?? '',
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id', ignoreDuplicates: true })
}

export async function createProject(
  lat: number,
  lng: number,
  userId: string
): Promise<Project> {
  const supabase = createClient()

  const project_type = PROJECT_TYPES[Math.floor(Math.random() * PROJECT_TYPES.length)]

  const { data, error } = await supabase
    .from('projects')
    .insert({
      latitude: lat,
      longitude: lng,
      created_by: userId,
      name: PROJECT_TYPE_DEFAULT_NAMES[project_type],
      project_type,
      contributor_count: 1,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'created_at' | 'created_by' | 'creator'>>
): Promise<Project> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
