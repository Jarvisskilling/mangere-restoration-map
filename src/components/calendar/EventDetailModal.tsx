'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { CalendarCheck, Clock, Mail, MapPin, MessageCircle, Send, Users } from 'lucide-react'
import {
  fetchEventSignupState,
  fetchEventSignups,
  fetchEventMessages,
  followEvent,
  sendEventMessage,
  subscribeEventMessages,
  unfollowEvent,
} from '@/services/notificationService'
import type { CommunityEvent, EventMessage, EventSignup } from '@/types'
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
  const [signups, setSignups] = useState<EventSignup[]>([])
  const [messages, setMessages] = useState<EventMessage[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

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

  useEffect(() => {
    if (!event || event.created_by !== userId) {
      setSignups([])
      return
    }

    let alive = true
    fetchEventSignups('community', event.id)
      .then(rows => { if (alive) setSignups(rows) })
      .catch(() => {})

    return () => { alive = false }
  }, [event, userId, signupCount])

  useEffect(() => {
    if (!event || !userId || !signedUp) {
      setMessages([])
      return
    }

    let alive = true
    const loadMessages = () => {
      fetchEventMessages('community', event.id)
        .then(rows => { if (alive) setMessages(rows) })
        .catch(() => {})
    }

    loadMessages()
    const unsubscribe = subscribeEventMessages('community', event.id, loadMessages)

    return () => {
      alive = false
      unsubscribe()
    }
  }, [event, userId, signedUp])

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

  const handleSendMessage = async () => {
    if (!event || !userId || !messageDraft.trim() || sendingMessage) return

    setSendingMessage(true)
    try {
      const sent = await sendEventMessage('community', event.id, userId, messageDraft)
      setMessages(items => [...items, sent])
      setMessageDraft('')
    } catch {
      toast.error('Failed to post update')
    } finally {
      setSendingMessage(false)
    }
  }

  const isOrganiser = isAuthenticated && event.created_by === userId

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

        {isOrganiser && (
          <div className="liquid-glass-card mt-3 rounded-2xl p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-medium text-[#183225]/60">
              <span>People keen to come</span>
              <span>{signups.length}</span>
            </div>
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
              {signups.length === 0 && (
                <p className="text-xs text-[#183225]/40">No followers yet.</p>
              )}
              {signups.map(signup => (
                <div key={signup.id} className="flex items-center gap-2 rounded-xl bg-white/35 px-2.5 py-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-xs font-semibold text-green-700">
                    {(signup.attendee_name || signup.attendee_email || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#183225]/70">
                      {signup.attendee_name || 'Unnamed follower'}
                    </p>
                    {signup.attendee_email && (
                      <a href={`mailto:${signup.attendee_email}`} className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[#183225]/40">
                        <Mail className="h-3 w-3 shrink-0" />
                        {signup.attendee_email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="liquid-glass-card mt-3 rounded-2xl p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#183225]/60">
            <MessageCircle className="h-3.5 w-3.5" />
            Event group chat
          </div>
          {!userId && (
            <p className="rounded-xl bg-white/35 px-3 py-2 text-xs text-[#183225]/45">Sign in and follow this event to join the chat.</p>
          )}
          {userId && !signedUp && (
            <p className="rounded-xl bg-white/35 px-3 py-2 text-xs text-[#183225]/45">Follow this event to join the chat.</p>
          )}
          {userId && signedUp && (
            <>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="rounded-xl bg-white/35 px-3 py-2 text-xs text-[#183225]/45">No updates yet.</p>
                )}
                {messages.map(message => {
                  const mine = message.user_id === userId
                  return (
                    <div key={message.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <div className="mb-1 px-1 text-[10px] text-[#183225]/35">
                        {message.author?.full_name || message.author?.email || 'Follower'}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${mine ? 'bg-green-600 text-white' : 'bg-white/45 text-[#183225]/65'}`}>
                        {message.message}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={messageDraft}
                  onChange={e => setMessageDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleSendMessage()
                    }
                  }}
                  placeholder="Post an update..."
                  className="min-w-0 flex-1 rounded-xl border border-white/40 bg-white/45 px-3 py-2 text-xs text-[#183225] outline-none placeholder:text-[#183225]/35 focus:border-green-500/45"
                />
                <Button size="sm" onClick={handleSendMessage} loading={sendingMessage} disabled={!messageDraft.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
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
