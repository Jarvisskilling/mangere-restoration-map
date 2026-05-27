'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { MapPin, Clock } from 'lucide-react'
import type { CommunityEvent } from '@/types'
import { EVENT_TYPE_COLORS } from '@/types'

interface EventDetailModalProps {
  event: CommunityEvent | null
  onClose: () => void
  userId?: string
  isAuthenticated: boolean
  onEdit?: (event: CommunityEvent) => void
}

export default function EventDetailModal({ event, onClose, userId, isAuthenticated, onEdit }: EventDetailModalProps) {
  if (!event) return null

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

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
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
