import { createClient } from '@/lib/supabase/client'
import type {
  EventSignupSummary,
  EventSource,
  EventType,
  NotificationPreference,
  UserNotification,
} from '@/types'

export const DEFAULT_NOTIFICATION_PREFERENCE = {
  area_label: 'Māngere',
  latitude: -37.0,
  longitude: 174.8,
  radius_km: 10,
  event_types: ['planting'] as EventType[],
  enabled: true,
}

const GUEST_EVENT_FOLLOWS_STORAGE_KEY = 'mangere-event-follows'

function eventFollowKey(eventSource: EventSource, eventId: string) {
  return `${eventSource}:${eventId}`
}

function readGuestEventFollows(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(GUEST_EVENT_FOLLOWS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeGuestEventFollows(keys: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_EVENT_FOLLOWS_STORAGE_KEY, JSON.stringify([...new Set(keys)]))
  } catch {
    // Guest follows are a convenience; account follows still persist through Supabase.
  }
}

export function isGuestFollowingEvent(eventSource: EventSource, eventId: string): boolean {
  return readGuestEventFollows().includes(eventFollowKey(eventSource, eventId))
}

export function followGuestEvent(eventSource: EventSource, eventId: string): void {
  writeGuestEventFollows([...readGuestEventFollows(), eventFollowKey(eventSource, eventId)])
}

export function unfollowGuestEvent(eventSource: EventSource, eventId: string): void {
  const key = eventFollowKey(eventSource, eventId)
  writeGuestEventFollows(readGuestEventFollows().filter(item => item !== key))
}

export async function fetchNotificationPreference(userId: string): Promise<NotificationPreference | null> {
  // The app does not generate Supabase database types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertNotificationPreference(
  preference: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationPreference> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(preference, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchEventSignupState(
  eventSource: EventSource,
  eventId: string,
  userId?: string
): Promise<EventSignupSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const [countResult, ownSignup] = await Promise.all([
    supabase
      .from('event_signups')
      .select('*', { count: 'exact', head: true })
      .eq('event_source', eventSource)
      .eq('event_id', eventId),
    userId
      ? supabase
          .from('event_signups')
          .select('id')
          .eq('event_source', eventSource)
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const guestSignedUp = userId ? false : isGuestFollowingEvent(eventSource, eventId)
  if (countResult.error && userId) throw countResult.error
  if (ownSignup.error) throw ownSignup.error

  return {
    count: (countResult.count ?? 0) + (guestSignedUp ? 1 : 0),
    signedUp: !!ownSignup.data || guestSignedUp,
  }
}

export async function fetchEventSignupSummaries(
  eventSource: EventSource,
  eventIds: string[],
  userId?: string
): Promise<Record<string, EventSignupSummary>> {
  if (eventIds.length === 0) return {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from('event_signups')
    .select('event_id,user_id')
    .eq('event_source', eventSource)
    .in('event_id', eventIds)

  const summaries = eventIds.reduce<Record<string, EventSignupSummary>>((acc, id) => {
    acc[id] = { count: 0, signedUp: false }
    return acc
  }, {})

  if (error && userId) throw error

  for (const row of error ? [] : data ?? []) {
    const id = row.event_id as string
    summaries[id] ??= { count: 0, signedUp: false }
    summaries[id].count += 1
    if (userId && row.user_id === userId) summaries[id].signedUp = true
  }

  if (!userId) {
    for (const id of eventIds) {
      if (!isGuestFollowingEvent(eventSource, id)) continue
      summaries[id].signedUp = true
      summaries[id].count += 1
    }
  }

  return summaries
}

export async function followEvent(
  eventSource: EventSource,
  eventId: string,
  userId?: string
): Promise<'account' | 'guest'> {
  if (!userId) {
    followGuestEvent(eventSource, eventId)
    return 'guest'
  }

  await signUpForEvent(eventSource, eventId, userId)
  return 'account'
}

export async function unfollowEvent(
  eventSource: EventSource,
  eventId: string,
  userId?: string
): Promise<'account' | 'guest'> {
  if (!userId) {
    unfollowGuestEvent(eventSource, eventId)
    return 'guest'
  }

  await leaveEvent(eventSource, eventId, userId)
  return 'account'
}

export async function signUpForEvent(
  eventSource: EventSource,
  eventId: string,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { error } = await supabase
    .from('event_signups')
    .upsert({
      event_source: eventSource,
      event_id: eventId,
      user_id: userId,
      notify_updates: true,
    }, { onConflict: 'event_source,event_id,user_id' })

  if (error) throw error
}

export async function leaveEvent(
  eventSource: EventSource,
  eventId: string,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { error } = await supabase
    .from('event_signups')
    .delete()
    .eq('event_source', eventSource)
    .eq('event_id', eventId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function fetchUnreadNotifications(userId: string): Promise<UserNotification[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}
