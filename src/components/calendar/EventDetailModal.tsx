'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { CalendarCheck, Clock, MapPin, Users } from 'lucide-react'
import {
  fetchEventSignupState,
  followEvent,
  unfollowEvent,
} from '@/services/notificationService'
import type { CommunityEvent } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'
import toast from 'react-hot-toast'

interface EventDetailModalProps {
  event: CommunityEvent | null
  onClose: () => void
  userId?: string
  isAuthenticated: boolean
  onEdit?: (event: CommunityEvent) => void
}

export default function EventDetailModal({ event, onClose, userId, isAuthenticated, onEdit }: EventDetailModalProps) {
  const [signupCount, setSignupCount] = useState(0)
  const [signedUp, setSignedUp] = useState(false)
  const [savingSignup, setSavingSignup] = useState(false)

  useEffect(() => {
    if (!event) return
    let alive = true
    fetchEventSignupState('community', event.id, userId)
      .then(state => {
        if (!alive) return
        setSignupCount(state.count)
        setSignedUp(state.signedUp)
      })
      .catch(() => {})

    return () => { alive = false }
  }, [event, userId])

  if (!event) return null

  const handleSignup = async () => {
    if (savingSignup) return

    setSavingSignup(true)
    try {
      if (signedUp) {
        await unfollowEvent('community', event.id, userId)
        setSignedUp(false)
        setSignupCount(count => Math.max(0, count - 1))
        toast.success(userId ? 'Removed from event' : 'Unfollowed on this device')
      } else {
        const mode = await followEvent('community', event.id, userId)
        setSignedUp(true)
        setSignupCount(count => count + 1)
        toast.success(mode === 'account' ? 'Following event' : 'Following on this device')
      }
    } catch {
      toast.error('Failed to update follow')
    } finally {
      setSavingSignup(false)
    }
  }

  return (
    <Modal open={!!event} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ background: event.color ?? EVENT_TYPE_COLORS[event.event_type] }}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
          </span>
        </div>

        <h3 className="mb-4 text-lg font-semibold text-white leading-snug">{event.title}</h3>

        <div className="mb-3 flex items-start gap-2.5 text-sm text-white/60">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
          <span>
            {new Date(event.start_date).toLocaleDateString('en-NZ', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
            {event.end_date && event.end_date !== event.start_date && (
              <> &ndash; {new Date(event.end_date).toLocaleDateString('en-NZ', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}</>
            )}
          </span>
        </div>

        {event.location && (
          <div className="mb-3 flex items-start gap-2.5 text-sm text-white/60">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/30" />
            <span>{event.location}</span>
          </div>
        )}

        {event.description && (
          <p className="mt-4 border-t border-white/8 pt-4 text-sm text-white/50 leading-relaxed">
            {event.description}
          </p>
        )}

        <div className="liquid-glass-card mt-5 flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-[#183225]/55">
          <Users className="h-3.5 w-3.5 text-[#183225]/35" />
          <span>{signupCount} following</span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          <Button
            variant={signedUp ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleSignup}
            loading={savingSignup}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            {signedUp ? 'Following' : 'Follow'}
          </Button>
          {isAuthenticated && event.created_by === userId && onEdit && (
            <Button variant="primary" size="sm" onClick={() => { onClose(); onEdit(event) }}>
              Edit event
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
