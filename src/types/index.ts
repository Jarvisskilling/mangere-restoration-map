export interface User {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  created_at: string
}

export type ProjectType = 'restoration' | 'planting' | 'cleanup' | 'monitoring' | 'education'
export type ProjectStatus = 'active' | 'completed' | 'planned'
export type EventType = 'planting' | 'cleanup' | 'meetup' | 'gathering' | 'monitoring' | 'other'
export type EventSource = 'project' | 'community'

export interface Project {
  id: string
  name: string
  description?: string | null
  latitude: number
  longitude: number
  created_by?: string | null
  trees_planted: number
  area_sqm: number
  contributor_count: number
  volunteer_hours?: number | null
  contact_details?: string | null
  project_type: ProjectType
  status: ProjectStatus
  created_at: string
  updated_at: string
  creator?: User | null
}

export interface ProjectObservation {
  id: string
  project_id: string
  content: string
  observed_at: string
  created_by?: string | null
  created_at: string
}

export interface ProjectFollower {
  id: string
  project_id: string
  user_id: string
  notify_new_events: boolean
  created_at: string
}

export interface EventSignup {
  id: string
  event_id: string
  event_source: EventSource
  user_id: string
  notify_updates: boolean
  created_at: string
}

export interface EventSignupSummary {
  count: number
  signedUp: boolean
}

export interface NotificationPreference {
  id: string
  user_id: string
  area_label: string
  latitude: number
  longitude: number
  radius_km: number
  event_types: EventType[]
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface UserNotification {
  id: string
  user_id: string
  notification_type: 'new_event' | 'event_update'
  title: string
  body?: string | null
  event_id?: string | null
  event_source?: EventSource | null
  project_id?: string | null
  read_at?: string | null
  created_at: string
}

export interface ProjectImage {
  id: string
  project_id: string
  storage_path: string
  url: string
  caption?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface ProjectStory {
  id: string
  project_id: string
  content: string
  updated_by?: string | null
  updated_at: string
}

export interface ProjectEvent {
  id: string
  project_id: string
  title: string
  description?: string | null
  start_date: string
  end_date?: string | null
  all_day: boolean
  event_type: EventType
  color?: string | null
  created_by?: string | null
  created_at: string
}

export interface CommunityEvent {
  id: string
  title: string
  description?: string | null
  start_date: string
  end_date?: string | null
  all_day: boolean
  event_type: EventType
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  color?: string | null
  created_by?: string | null
  created_at: string
}

export interface Statistics {
  id: string
  total_trees_planted: number
  total_volunteers: number
  total_area_sqm: number
  updated_at: string
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  planting: '#22c55e',
  cleanup: '#3b82f6',
  meetup: '#a855f7',
  gathering: '#f59e0b',
  monitoring: '#06b6d4',
  other: '#6b7280',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  restoration: 'Restoration',
  planting: 'Planting',
  cleanup: 'Cleanup',
  monitoring: 'Monitoring',
  education: 'Education',
}

export const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  restoration: '#22c55e',
  planting: '#84cc16',
  cleanup: '#f97316',
  monitoring: '#06b6d4',
  education: '#a855f7',
}

export const PROJECT_TYPE_DEFAULT_NAMES: Record<ProjectType, string> = {
  restoration: 'New Restoration Site',
  planting: 'New Planting Site',
  cleanup: 'New Cleanup Site',
  monitoring: 'New Monitoring Site',
  education: 'New Education Site',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#22c55e',
  completed: '#3b82f6',
  planned: '#f59e0b',
}
