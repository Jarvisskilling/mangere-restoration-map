'use client'

import { useState, useEffect, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventChangeArg } from '@fullcalendar/core'
import {
  fetchCommunityEvents,
  createCommunityEvent,
  updateCommunityEvent,
  deleteCommunityEvent,
} from '@/services/eventService'
import type { CommunityEvent, EventType } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import EventDetailModal from './EventDetailModal'
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel'
import { Calendar, Globe, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface CommunityCalendarProps {
  userId?: string
  isAuthenticated: boolean
  onEventsChange?: (events: CommunityEvent[]) => void
}

interface EventFormState {
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  eventType: EventType
}

const DEFAULT_FORM: EventFormState = {
  title: '',
  description: '',
  location: '',
  start: '',
  end: '',
  allDay: false,
  eventType: 'planting',
}

async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Auckland New Zealand')}&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'MangereRestorationMap/1.0' } })
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export default function CommunityCalendar({ userId, isAuthenticated, onEventsChange }: CommunityCalendarProps) {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null)
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<CommunityEvent | null>(null)

  const applyEvents = useCallback((data: CommunityEvent[]) => {
    setEvents(data)
    onEventsChange?.(data)
  }, [onEventsChange])

  useEffect(() => {
    fetchCommunityEvents().then(data => {
      applyEvents(data)
      setLoading(false)
    })
  }, [applyEvents])

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start_date,
    end: e.end_date ?? undefined,
    allDay: e.all_day,
    backgroundColor: e.color ?? EVENT_TYPE_COLORS[e.event_type],
    borderColor: 'transparent',
    extendedProps: { ...e },
  }))

  const openCreate = (dateStr?: string) => {
    setEditingEvent(null)
    setForm({
      ...DEFAULT_FORM,
      start: dateStr ? `${dateStr}T09:00` : '',
      end: dateStr ? `${dateStr}T11:00` : '',
    })
    setShowForm(true)
  }

  const openEdit = (evt: CommunityEvent) => {
    setEditingEvent(evt)
    setForm({
      title: evt.title,
      description: evt.description ?? '',
      location: evt.location ?? '',
      start: evt.start_date.slice(0, 16),
      end: evt.end_date?.slice(0, 16) ?? '',
      allDay: evt.all_day,
      eventType: evt.event_type,
    })
    setShowForm(true)
  }

  const handleDateClick = (arg: DateClickArg) => {
    if (!isAuthenticated) return
    openCreate(arg.dateStr)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const evt = arg.event.extendedProps as CommunityEvent
    setViewingEvent(evt)
  }

  const handleEventChange = async (arg: EventChangeArg) => {
    if (!isAuthenticated) return
    try {
      const updated = await updateCommunityEvent(arg.event.id, {
        start_date: arg.event.startStr,
        end_date: arg.event.endStr || undefined,
        all_day: arg.event.allDay,
      })
      applyEvents(events.map(e => e.id === updated.id ? updated : e))
    } catch {
      arg.revert()
      toast.error('Failed to update event')
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)

    // Geocode the location in the background — don't block save if it fails
    let latitude: number | undefined
    let longitude: number | undefined
    if (form.location) {
      const coords = await geocodeLocation(form.location)
      if (coords) { latitude = coords.lat; longitude = coords.lng }
    }

    try {
      if (editingEvent) {
        const updated = await updateCommunityEvent(editingEvent.id, {
          title: form.title,
          description: form.description || undefined,
          location: form.location || undefined,
          latitude,
          longitude,
          start_date: form.start,
          end_date: form.end || undefined,
          all_day: form.allDay,
          event_type: form.eventType,
          color: EVENT_TYPE_COLORS[form.eventType],
        })
        applyEvents(events.map(e => e.id === updated.id ? updated : e))
        toast.success('Event updated')
      } else {
        const created = await createCommunityEvent({
          title: form.title,
          description: form.description || undefined,
          location: form.location || undefined,
          latitude,
          longitude,
          start_date: form.start,
          end_date: form.end || undefined,
          all_day: form.allDay,
          event_type: form.eventType,
          color: EVENT_TYPE_COLORS[form.eventType],
          created_by: userId,
        })
        applyEvents([...events, created])
        if (latitude) toast.success('Event added and pinned on map!')
        else toast.success('Community event added!')
      }
      setShowForm(false)
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    try {
      await deleteCommunityEvent(editingEvent.id)
      applyEvents(events.filter(e => e.id !== editingEvent.id))
      setShowForm(false)
      toast.success('Event removed')
    } catch {
      toast.error('Failed to delete event')
    }
  }

  return (
    <section className="border-t border-[#5c6f55]/12 bg-[#f5f1e8] px-4 py-10 sm:px-6 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#5f8f49]/18 bg-[#5f8f49]/8 px-3 py-1 text-xs font-medium text-[#4f7f3f]">
              <Globe className="h-3 w-3" />
              Community
            </div>
            <h2 className="text-2xl font-bold text-[#183225]">Community Calendar</h2>
            <p className="mt-1 text-sm text-[#183225]/55">
              Upcoming restoration events, cleanups, and community gatherings across Māngere
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <NotificationPreferencesPanel userId={userId} isAuthenticated={isAuthenticated} />
            {isAuthenticated && (
              <Button variant="primary" size="md" onClick={() => openCreate()} className="w-full sm:w-auto">
                <Calendar className="h-4 w-4" />
                Add event
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-3">
          {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-[#183225]/52">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
          </div>
        ) : (
          <div className="community-calendar liquid-glass-surface rounded-3xl p-2 sm:p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth',
              }}
              events={fcEvents}
              editable={isAuthenticated}
              selectable={isAuthenticated}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventChange={handleEventChange}
              height="auto"
              eventDisplay="block"
              displayEventTime={false}
              dayMaxEvents={4}
              listDayFormat={{ weekday: 'long', month: 'long', day: 'numeric' }}
              noEventsContent="No upcoming events. Sign in to add one!"
            />
          </div>
        )}

        {!isAuthenticated && (
          <p className="mt-4 text-center text-xs text-[#183225]/42">
            Sign in to add and manage community events
          </p>
        )}
      </div>

      {/* Event detail modal */}
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        userId={userId}
        isAuthenticated={isAuthenticated}
        onEdit={(evt) => openEdit(evt)}
      />

      {/* Event form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingEvent ? 'Edit community event' : 'Add community event'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Māngere Estuary Cleanup"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Māngere Mountain, Auckland"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Start *</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:light]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">End</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:light]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Event type</label>
              <select
                value={form.eventType}
                onChange={e => setForm(f => ({ ...f, eventType: e.target.value as EventType }))}
                className="liquid-glass-control w-full rounded-lg px-3 py-2 text-sm text-[#183225] outline-none"
              >
                {Object.keys(EVENT_TYPE_COLORS).map(type => (
                  <option key={type} value={type} className="bg-[#fffaf1] text-[#183225]">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={e => setForm(f => ({ ...f, allDay: e.target.checked }))}
                  className="accent-green-500"
                />
                <span className="text-sm text-white/60">All day</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What to expect, what to bring…"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            {editingEvent && editingEvent.created_by === userId && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title || !form.start}
            >
              {editingEvent ? 'Update' : 'Add event'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
