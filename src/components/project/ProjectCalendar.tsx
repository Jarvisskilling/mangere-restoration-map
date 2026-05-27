'use client'

import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventChangeArg } from '@fullcalendar/core'
import {
  fetchProjectEvents,
  createProjectEvent,
  updateProjectEvent,
  deleteProjectEvent,
} from '@/services/eventService'
import type { ProjectEvent, EventType } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectCalendarProps {
  projectId: string
  userId?: string
  canEdit: boolean
}

interface EventFormState {
  title: string
  description: string
  start: string
  end: string
  allDay: boolean
  eventType: EventType
}

const DEFAULT_FORM: EventFormState = {
  title: '',
  description: '',
  start: '',
  end: '',
  allDay: false,
  eventType: 'planting',
}

export default function ProjectCalendar({ projectId, userId, canEdit }: ProjectCalendarProps) {
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null)
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const calRef = useRef<FullCalendar>(null)

  useEffect(() => {
    fetchProjectEvents(projectId).then(data => {
      setEvents(data)
      setLoading(false)
    })
  }, [projectId])

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
      end: dateStr ? `${dateStr}T10:00` : '',
    })
    setShowForm(true)
  }

  const openEdit = (event: ProjectEvent) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      description: event.description ?? '',
      start: event.start_date.slice(0, 16),
      end: event.end_date?.slice(0, 16) ?? '',
      allDay: event.all_day,
      eventType: event.event_type,
    })
    setShowForm(true)
  }

  const handleDateClick = (arg: DateClickArg) => {
    if (!canEdit) return
    openCreate(arg.dateStr)
  }

  const handleEventClick = (arg: EventClickArg) => {
    const evt = arg.event.extendedProps as ProjectEvent
    if (canEdit) openEdit(evt)
  }

  const handleEventChange = async (arg: EventChangeArg) => {
    if (!canEdit) return
    try {
      const updated = await updateProjectEvent(arg.event.id, {
        start_date: arg.event.startStr,
        end_date: arg.event.endStr || undefined,
        all_day: arg.event.allDay,
      })
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch {
      arg.revert()
      toast.error('Failed to update event')
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      if (editingEvent) {
        const updated = await updateProjectEvent(editingEvent.id, {
          title: form.title,
          description: form.description || undefined,
          start_date: form.start,
          end_date: form.end || undefined,
          all_day: form.allDay,
          event_type: form.eventType,
          color: EVENT_TYPE_COLORS[form.eventType],
        })
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
        toast.success('Event updated')
      } else {
        const created = await createProjectEvent({
          project_id: projectId,
          title: form.title,
          description: form.description || undefined,
          start_date: form.start,
          end_date: form.end || undefined,
          all_day: form.allDay,
          event_type: form.eventType,
          color: EVENT_TYPE_COLORS[form.eventType],
          created_by: userId,
        })
        setEvents(prev => [...prev, created])
        toast.success('Event created')
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
      await deleteProjectEvent(editingEvent.id)
      setEvents(prev => prev.filter(e => e.id !== editingEvent.id))
      setShowForm(false)
      toast.success('Event deleted')
    } catch {
      toast.error('Failed to delete event')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
      </div>
    )
  }

  return (
    <>
      <div className="project-calendar">
        {canEdit && (
          <div className="mb-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => openCreate()}>
              <Calendar className="h-3.5 w-3.5" />
              Add event
            </Button>
          </div>
        )}

        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          events={fcEvents}
          editable={canEdit}
          selectable={canEdit}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </div>

      {/* Event form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingEvent ? 'Edit event' : 'New event'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Community Planting Day"
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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">End</label>
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Type</label>
              <select
                value={form.eventType}
                onChange={e => setForm(f => ({ ...f, eventType: e.target.value as EventType }))}
                className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-green-500/40"
              >
                {Object.entries(EVENT_TYPE_COLORS).map(([type]) => (
                  <option key={type} value={type} className="bg-[#111]">
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
                  className="rounded border-white/20 bg-white/5 text-green-500 accent-green-500"
                />
                <span className="text-sm text-white/60">All day</span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details…"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            {editingEvent && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!form.title || !form.start}
            >
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
