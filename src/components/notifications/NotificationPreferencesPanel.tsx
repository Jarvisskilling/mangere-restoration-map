'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, Check, MapPin } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  DEFAULT_NOTIFICATION_PREFERENCE,
  fetchNotificationPreference,
  upsertNotificationPreference,
} from '@/services/notificationService'
import type { EventType, NotificationPreference } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'
import toast from 'react-hot-toast'

interface NotificationPreferencesPanelProps {
  userId?: string
  isAuthenticated: boolean
}

interface PreferenceForm {
  areaLabel: string
  latitude: number
  longitude: number
  radiusKm: number
  eventTypes: EventType[]
  enabled: boolean
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_COLORS) as EventType[]

async function geocodeArea(areaLabel: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaLabel + ' Auckland New Zealand')}&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (!data[0]) return null
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

function formFromPreference(preference: NotificationPreference | null): PreferenceForm {
  return {
    areaLabel: preference?.area_label ?? DEFAULT_NOTIFICATION_PREFERENCE.area_label,
    latitude: preference?.latitude ?? DEFAULT_NOTIFICATION_PREFERENCE.latitude,
    longitude: preference?.longitude ?? DEFAULT_NOTIFICATION_PREFERENCE.longitude,
    radiusKm: preference?.radius_km ?? DEFAULT_NOTIFICATION_PREFERENCE.radius_km,
    eventTypes: preference?.event_types?.length
      ? preference.event_types
      : DEFAULT_NOTIFICATION_PREFERENCE.event_types,
    enabled: preference?.enabled ?? DEFAULT_NOTIFICATION_PREFERENCE.enabled,
  }
}

export default function NotificationPreferencesPanel({
  userId,
  isAuthenticated,
}: NotificationPreferencesPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preference, setPreference] = useState<NotificationPreference | null>(null)
  const [form, setForm] = useState<PreferenceForm>(formFromPreference(null))

  useEffect(() => {
    if (!userId) {
      setPreference(null)
      setForm(formFromPreference(null))
      return
    }
    let alive = true
    setLoading(true)
    fetchNotificationPreference(userId)
      .then(data => {
        if (!alive) return
        setPreference(data)
        setForm(formFromPreference(data))
      })
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [userId])

  const handleOpen = () => {
    if (!isAuthenticated || !userId) {
      toast.error('Sign in to set notifications')
      return
    }
    setOpen(true)
  }

  const toggleEventType = (eventType: EventType) => {
    setForm(current => {
      const hasType = current.eventTypes.includes(eventType)
      return {
        ...current,
        eventTypes: hasType
          ? current.eventTypes.filter(type => type !== eventType)
          : [...current.eventTypes, eventType],
      }
    })
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const areaChanged = form.areaLabel.trim() !== (preference?.area_label ?? DEFAULT_NOTIFICATION_PREFERENCE.area_label)
      const coords = areaChanged ? await geocodeArea(form.areaLabel.trim()) : null
      const saved = await upsertNotificationPreference({
        user_id: userId,
        area_label: form.areaLabel.trim() || DEFAULT_NOTIFICATION_PREFERENCE.area_label,
        latitude: coords?.latitude ?? form.latitude,
        longitude: coords?.longitude ?? form.longitude,
        radius_km: form.radiusKm,
        event_types: form.eventTypes,
        enabled: form.enabled,
      })

      setPreference(saved)
      setForm(formFromPreference(saved))
      setOpen(false)
      toast.success(saved.enabled ? 'Notifications saved' : 'Notifications paused')
    } catch {
      toast.error('Failed to save notifications')
    } finally {
      setSaving(false)
    }
  }

  const active = isAuthenticated && !!preference?.enabled

  return (
    <>
      <Button
        variant={active ? 'primary' : 'secondary'}
        size="md"
        onClick={handleOpen}
        className="w-full sm:w-auto"
      >
        {active ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        Notifications
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notifications" size="md">
        <div className="p-6 space-y-5">
          <label className="liquid-glass-card flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
            <span className="text-sm font-medium text-[#183225]">Notify me</span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(current => ({ ...current, enabled: e.target.checked }))}
              className="h-5 w-5 accent-[#5f8f49]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#183225]/55">Area</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#183225]/38" />
                <input
                  type="text"
                  value={form.areaLabel}
                  onChange={e => setForm(current => ({ ...current, areaLabel: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#5c6f55]/14 bg-white/70 pl-9 pr-3 text-sm text-[#183225] outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[#5f8f49]/38 focus:bg-white focus:shadow-[0_0_0_4px_rgba(95,143,73,0.08)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#183225]/55">Radius</label>
              <select
                value={form.radiusKm}
                onChange={e => setForm(current => ({ ...current, radiusKm: Number(e.target.value) }))}
                className="h-10 w-full rounded-xl border border-[#5c6f55]/14 bg-white/70 px-3 text-sm text-[#183225] outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[#5f8f49]/38 focus:bg-white focus:shadow-[0_0_0_4px_rgba(95,143,73,0.08)]"
              >
                {[2, 5, 10, 20].map(radius => (
                  <option key={radius} value={radius}>{radius} km</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[#183225]/55">Event types</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(eventType => {
                const selected = form.eventTypes.includes(eventType)
                return (
                  <button
                    key={eventType}
                    type="button"
                    onClick={() => toggleEventType(eventType)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                      selected
                        ? 'border-transparent text-white shadow-[0_8px_18px_rgba(65,75,55,0.14)]'
                        : 'liquid-glass-control text-[#183225]/62 hover:text-[#183225]'
                    }`}
                    style={selected ? { backgroundColor: EVENT_TYPE_COLORS[eventType] } : undefined}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#5c6f55]/12 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving || loading}
              disabled={!form.areaLabel.trim() || form.eventTypes.length === 0}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
