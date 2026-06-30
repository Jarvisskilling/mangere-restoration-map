import { createClient } from '@/lib/supabase/client'

const GUEST_PROJECT_FOLLOWS_STORAGE_KEY = 'mangere-project-follows'

function readGuestProjectFollows(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(GUEST_PROJECT_FOLLOWS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeGuestProjectFollows(projectIds: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_PROJECT_FOLLOWS_STORAGE_KEY, JSON.stringify([...new Set(projectIds)]))
  } catch {
    // Guest follows are a local convenience; signed-in follows still persist through Supabase.
  }
}

export function isGuestFollowingProject(projectId: string): boolean {
  return readGuestProjectFollows().includes(projectId)
}

export function followGuestProject(projectId: string): void {
  writeGuestProjectFollows([...readGuestProjectFollows(), projectId])
}

export function unfollowGuestProject(projectId: string): void {
  writeGuestProjectFollows(readGuestProjectFollows().filter(id => id !== projectId))
}

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
