'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { createCommunityEvent } from '@/services/eventService'
import type { CommunityEvent, EventType } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'
import toast from 'react-hot-toast'

interface CreateEventFromMapModalProps {
  open: boolean
  lat: number
  lng: number
  userId: string
  onClose: () => void
  onEventCreated: (event: CommunityEvent) => void
}

export default function CreateEventFromMapModal({
  open, lat, lng, userId, onClose, onEventCreated,
}: CreateEventFromMapModalProps) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [eventType, setEventType] = useState<EventType>('planting')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(''); setLocation(''); setStart(''); setEnd('')
      setAllDay(true); setEventType('planting'); setDescription('')
    }
  }, [open])

  const handleSave = async () => {
    if (!title.trim() || !start) return
    setSaving(true)
    try {
      const created = await createCommunityEvent({
        title: title.trim(),
        location: location || undefined,
        latitude: lat,
        longitude: lng,
        start_date: start,
        end_date: end || undefined,
        all_day: allDay,
        event_type: eventType,
        description: description || undefined,
        color: EVENT_TYPE_COLORS[eventType],
        created_by: userId,
      })
      onEventCreated(created)
      toast.success('Event added and pinned on map!')
      onClose()
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add community event" size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            placeholder="e.g. Māngere Estuary Cleanup"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Location name</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Māngere Mountain"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
          />
          <p className="mt-1 text-xs text-white/25">Pinned at {lat.toFixed(4)}, {lng.toFixed(4)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Start *</label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">End</label>
            <input
              type={allDay ? 'date' : 'datetime-local'}
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-green-500/40 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Event type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EVENT_TYPE_COLORS) as EventType[]).map(type => {
                const active = type === eventType
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? 'border-transparent text-white' : 'border-white/10 text-white/40 hover:text-white/70'
                    }`}
                    style={active ? { backgroundColor: EVENT_TYPE_COLORS[type] } : {}}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-0.5">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="accent-green-500"
            />
            <span className="text-sm text-white/60">All day</span>
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What to expect, what to bring…"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!title.trim() || !start}
          >
            Add event
          </Button>
        </div>
      </div>
    </Modal>
  )
}
