'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Check, Trash2, Bell, BellOff,
  Users, TreePine, Clock, MapPin, Eye, Plus, ChevronDown, Pencil,
} from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { updateProject, deleteProject } from '@/services/projectService'
import { upsertProjectStory, fetchProjectStory } from '@/services/statisticsService'
import {
  fetchProjectEvents,
  createProjectEvent,
  updateProjectEvent,
  deleteProjectEvent,
} from '@/services/eventService'
import {
  fetchProjectObservations,
  createProjectObservation,
  deleteProjectObservation,
} from '@/services/observationService'
import {
  fetchFollowerCount,
  checkIsFollowing,
  followProject,
  unfollowProject,
} from '@/services/followerService'
import type { Project, ProjectEvent, ProjectObservation, EventType, ProjectType } from '@/types'
import { EVENT_TYPE_COLORS, PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS, PROJECT_TYPE_DEFAULT_NAMES } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

interface ProjectPanelProps {
  project: Project
  onClose: () => void
  onProjectUpdate: (p: Project) => void
  onProjectDelete: (id: string) => void
  userId: string
  isAuthenticated: boolean
}

interface EventForm {
  title: string
  eventType: EventType
  allDay: boolean
}
const EMPTY_EVENT: EventForm = { title: '', eventType: 'planting', allDay: true }
const today = new Date().toISOString().slice(0, 10)

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, editable, onChange, accent,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  editable?: boolean
  onChange?: (v: number) => void
  accent?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n !== Number(value)) onChange?.(n)
  }

  return (
    <div
      className={`relative group rounded-2xl border p-4 transition-all duration-300 overflow-hidden ${
        editable
          ? 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/12 cursor-pointer hover:-translate-y-0.5 hover:shadow-glass'
          : 'border-white/6 bg-white/[0.02]'
      }`}
      onClick={() => { if (editable && !editing) { setDraft(String(value)); setEditing(true) } }}
    >
      {editable && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 100%, ${accent ?? 'rgba(74,222,128,0.06)'} 0%, transparent 70%)` }}
        />
      )}
      <div className="relative flex flex-col gap-3">
        <div className="text-white/20">{icon}</div>
        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-full bg-transparent border-b border-green-500/40 text-2xl font-bold text-white outline-none tabular-nums pb-0.5"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="text-2xl font-bold text-white tracking-tight tabular-nums leading-none">
            {Number(value).toLocaleString()}
          </span>
        )}
        <span className="text-[9px] uppercase tracking-[0.14em] text-white/25 font-medium">{label}</span>
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/25 mb-4">{children}</p>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function ProjectPanel({
  project, onClose, onProjectUpdate, onProjectDelete, userId, isAuthenticated,
}: ProjectPanelProps) {
  const [name, setName] = useState(project.name)
  const [projectType, setProjectType] = useState<ProjectType>(project.project_type)
  const [story, setStory] = useState('')
  const [description, setDescription] = useState(project.description ?? '')
  const [contact, setContact] = useState(project.contact_details ?? '')
  const [trees, setTrees] = useState(project.trees_planted)
  const [hours, setHours] = useState(project.volunteer_hours ?? 0)
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [observations, setObservations] = useState<ProjectObservation[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT)
  const [selectedDate, setSelectedDate] = useState('')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)
  const [showObsForm, setShowObsForm] = useState(false)
  const [obsContent, setObsContent] = useState('')
  const [obsDate, setObsDate] = useState(today)
  const [savingObs, setSavingObs] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [descSaved, setDescSaved] = useState(true)

  const storyRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const descAutoSave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const contactAutoSave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isOwner = project.created_by === userId

  useEffect(() => {
    fetchProjectStory(project.id).then(s => { if (s) setStory(s.content) })
    fetchProjectEvents(project.id).then(setEvents)
    fetchProjectObservations(project.id).then(setObservations)
    fetchFollowerCount(project.id).then(setFollowerCount)
    if (isAuthenticated) checkIsFollowing(project.id, userId).then(setIsFollowing)
  }, [project.id, userId, isAuthenticated])

  useEffect(() => {
    const el = storyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [story])

  const handleStoryChange = (val: string) => {
    setStory(val)
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      try { await upsertProjectStory(project.id, val, userId) } catch { toast.error('Failed to save') }
    }, 1500)
  }

  const handleDescriptionChange = (val: string) => {
    setDescription(val); setDescSaved(false)
    clearTimeout(descAutoSave.current)
    descAutoSave.current = setTimeout(async () => {
      try {
        const updated = await updateProject(project.id, { description: val || null })
        onProjectUpdate(updated); setDescSaved(true)
      } catch { toast.error('Failed to save description') }
    }, 1500)
  }

  const handleContactChange = (val: string) => {
    setContact(val)
    clearTimeout(contactAutoSave.current)
    contactAutoSave.current = setTimeout(async () => {
      try {
        const updated = await updateProject(project.id, { contact_details: val || null } as Parameters<typeof updateProject>[1])
        onProjectUpdate(updated)
      } catch { toast.error('Failed to save contact') }
    }, 1500)
  }

  const handleSaveName = async () => {
    if (name === project.name || !name.trim()) return
    try {
      const updated = await updateProject(project.id, { name: name.trim() })
      onProjectUpdate(updated)
    } catch { toast.error('Failed to save name') }
  }

  const handleTypeChange = async (type: ProjectType) => {
    if (type === projectType) return
    const prevType = projectType; const prevName = name
    setProjectType(type)
    const isDefaultName = Object.values(PROJECT_TYPE_DEFAULT_NAMES).includes(name)
    const newName = isDefaultName ? PROJECT_TYPE_DEFAULT_NAMES[type] : name
    if (isDefaultName) setName(newName)
    try {
      const updated = await updateProject(project.id, { project_type: type, ...(isDefaultName ? { name: newName } : {}) })
      onProjectUpdate(updated)
    } catch {
      toast.error('Failed to update type'); setProjectType(prevType)
      if (isDefaultName) setName(prevName)
    }
  }

  const handleStatUpdate = async (field: 'trees_planted' | 'volunteer_hours', val: number) => {
    if (field === 'trees_planted') setTrees(val); else setHours(val)
    try {
      const updated = await updateProject(project.id, { [field]: val } as Parameters<typeof updateProject>[1])
      onProjectUpdate(updated)
    } catch { toast.error('Failed to update') }
  }

  const handleFollow = async () => {
    if (!isAuthenticated || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowProject(project.id, userId); setIsFollowing(false); setFollowerCount(c => Math.max(0, c - 1))
        toast('Unfollowed', { icon: '👋' })
      } else {
        await followProject(project.id, userId); setIsFollowing(true); setFollowerCount(c => c + 1)
        toast.success("Following — you'll be notified when events are added")
      }
    } catch { toast.error('Failed') } finally { setFollowLoading(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(project.id); onProjectDelete(project.id); onClose(); toast.success('Site deleted')
    } catch { toast.error('Failed to delete') }
  }

  const openNewEvent = () => { setEditingEventId(null); setSelectedDate(''); setEventForm(EMPTY_EVENT); setShowEventForm(true) }
  const openEditEvent = useCallback((evt: ProjectEvent) => {
    setEditingEventId(evt.id); setSelectedDate(evt.start_date.slice(0, 10))
    setEventForm({ title: evt.title, eventType: evt.event_type, allDay: evt.all_day }); setShowEventForm(true)
  }, [])

  const handleSaveEvent = async () => {
    if (!eventForm.title || !selectedDate) return
    setSavingEvent(true)
    const start_date = `${selectedDate}T${eventForm.allDay ? '00:00:00' : '09:00:00'}`
    try {
      if (editingEventId) {
        const updated = await updateProjectEvent(editingEventId, { title: eventForm.title, start_date, event_type: eventForm.eventType, all_day: eventForm.allDay, color: EVENT_TYPE_COLORS[eventForm.eventType] })
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e)); toast.success('Event updated')
      } else {
        const created = await createProjectEvent({ project_id: project.id, title: eventForm.title, start_date, event_type: eventForm.eventType, all_day: eventForm.allDay, color: EVENT_TYPE_COLORS[eventForm.eventType], created_by: userId })
        setEvents(prev => [...prev, created]); toast.success('Event added')
      }
      setShowEventForm(false)
    } catch { toast.error('Failed to save event') } finally { setSavingEvent(false) }
  }

  const handleDeleteEvent = async () => {
    if (!editingEventId) return
    try {
      await deleteProjectEvent(editingEventId); setEvents(prev => prev.filter(e => e.id !== editingEventId))
      setShowEventForm(false); toast.success('Event removed')
    } catch { toast.error('Failed to delete event') }
  }

  const handleSaveObservation = async () => {
    if (!obsContent.trim()) return
    setSavingObs(true)
    try {
      const created = await createProjectObservation({ project_id: project.id, content: obsContent.trim(), observed_at: obsDate, created_by: userId })
      setObservations(prev => [created, ...prev]); setObsContent(''); setObsDate(today); setShowObsForm(false)
      toast.success('Observation recorded')
    } catch { toast.error('Failed to save') } finally { setSavingObs(false) }
  }

  const handleDeleteObservation = async (id: string) => {
    try { await deleteProjectObservation(id); setObservations(prev => prev.filter(o => o.id !== id)) }
    catch { toast.error('Failed to delete') }
  }

  const upcomingEvents = events.filter(e => e.start_date.slice(0, 10) >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))
  const pastEvents = events.filter(e => e.start_date.slice(0, 10) < today).sort((a, b) => b.start_date.localeCompare(a.start_date))
  const fcEvents = events.map(e => ({ id: e.id, title: e.title, start: e.start_date, end: e.end_date ?? undefined, allDay: e.all_day, backgroundColor: e.color ?? EVENT_TYPE_COLORS[e.event_type], borderColor: 'transparent', extendedProps: e }))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1400] animate-fade-in" onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[1500] w-full sm:w-[520px] flex flex-col overflow-y-auto animate-slide-in-right"
        style={{ background: 'linear-gradient(160deg, #060606 0%, #040404 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Ambient header glow */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-64 opacity-30"
          style={{ background: `radial-gradient(ellipse at 30% 0%, ${PROJECT_TYPE_COLORS[projectType]}18 0%, transparent 70%)` }} />

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 px-6 pt-7 pb-5"
          style={{ background: 'linear-gradient(to bottom, #060606 60%, transparent 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                readOnly={!isOwner}
                className="w-full bg-transparent text-[22px] font-semibold tracking-tight text-white outline-none placeholder-white/10 leading-snug border-b border-transparent focus:border-white/10 transition-colors pb-0.5"
                placeholder="Site name…"
              />
              <div className="flex items-center gap-2 mt-2.5">
                <MapPin className="h-3 w-3 shrink-0" style={{ color: PROJECT_TYPE_COLORS[projectType], opacity: 0.6 }} />
                <span className="text-xs font-mono text-white/25 tracking-wider">
                  {project.latitude.toFixed(5)}, {project.longitude.toFixed(5)}
                </span>
                {project.creator?.full_name && (
                  <span className="text-white/15 text-xs">· {project.creator.full_name}</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {isAuthenticated && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  title={isFollowing ? 'Unfollow' : 'Follow project'}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 border ${
                    isFollowing
                      ? 'border-green-500/25 bg-green-500/8 text-green-400 hover:bg-red-500/8 hover:border-red-500/20 hover:text-red-400'
                      : 'border-white/8 bg-white/3 text-white/35 hover:bg-white/6 hover:text-white/60 hover:border-white/12'
                  }`}
                >
                  {isFollowing ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                  {isFollowing ? 'Following' : 'Follow'}
                  {followerCount > 0 && <span className="opacity-50 text-[10px]">{followerCount}</span>}
                </button>
              )}

              {isOwner && !confirmDelete && (
                <button onClick={() => setConfirmDelete(true)}
                  className="h-8 w-8 rounded-xl border border-white/6 bg-white/[0.02] flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/6 hover:border-red-500/15 transition-all duration-200">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {isOwner && confirmDelete && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-[11px] text-white/35">Delete site?</span>
                  <button onClick={handleDelete} className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-[11px] font-medium hover:bg-red-500/25 transition-all">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg border border-white/8 text-white/35 text-[11px] hover:text-white/60 transition-all">No</button>
                </div>
              )}

              <button onClick={onClose}
                className="h-8 w-8 rounded-xl border border-white/6 bg-white/[0.02] flex items-center justify-center text-white/25 hover:text-white hover:bg-white/6 hover:border-white/10 transition-all duration-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── SITE TYPE ── */}
        <div className="px-6 pb-6">
          <SectionLabel>Site type</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map(type => {
              const active = type === projectType
              const color = PROJECT_TYPE_COLORS[type]
              return (
                <button
                  key={type}
                  onClick={() => isOwner && handleTypeChange(type)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 border ${
                    active ? 'border-transparent text-black' : 'border-white/8 text-white/30 hover:text-white/55 hover:border-white/14'
                  } ${!isOwner ? 'cursor-default' : 'cursor-pointer'}`}
                  style={active ? {
                    backgroundColor: color,
                    boxShadow: `0 0 16px ${color}40, 0 0 4px ${color}30`,
                  } : {}}
                >
                  {PROJECT_TYPE_LABELS[type]}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="px-6 pb-7">
          <SectionLabel>Impact</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<TreePine className="h-4 w-4" />} label="Trees planted" value={trees}
              editable={isOwner} accent="rgba(74,222,128,0.07)"
              onChange={v => handleStatUpdate('trees_planted', v)} />
            <StatCard icon={<span className="text-xs font-mono">m²</span>} label="Area restored" value={project.area_sqm} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Volunteers" value={project.contributor_count} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Volunteer hours" value={hours}
              editable={isOwner} accent="rgba(74,222,128,0.07)"
              onChange={v => handleStatUpdate('volunteer_hours', v)} />
          </div>
          {isOwner && (
            <p className="mt-2.5 text-[9px] text-white/18 text-center tracking-wide">
              Click trees or hours to update
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/[0.05] mb-7" />

        {/* ── OVERVIEW ── */}
        <div className="px-6 pb-7">
          <SectionLabel>Overview</SectionLabel>
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={description}
                onChange={e => handleDescriptionChange(e.target.value)}
                placeholder="Describe this restoration site — ecosystem, history, goals, what makes it special…"
                rows={4}
                readOnly={!isOwner}
                className={`w-full resize-none rounded-2xl text-sm text-white/75 placeholder-white/15 outline-none leading-relaxed transition-all duration-200 px-4 py-3.5 ${
                  isOwner
                    ? 'bg-white/[0.03] border border-white/6 focus:bg-white/[0.05] focus:border-white/12'
                    : 'bg-transparent border border-white/4 cursor-default'
                }`}
              />
              {isOwner && (
                <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 text-[9px] transition-all duration-500 ${descSaved ? 'text-white/18' : 'text-green-400/60'}`}>
                  <span className={`h-1 w-1 rounded-full ${descSaved ? 'bg-white/20' : 'bg-green-400 animate-pulse'}`} />
                  {descSaved ? 'Saved' : 'Saving…'}
                </div>
              )}
            </div>

            {(isOwner || contact) && (
              <div className="relative">
                <label className="block text-[9px] uppercase tracking-[0.14em] text-white/22 font-medium mb-2">Contact</label>
                <input
                  type="text"
                  value={contact}
                  onChange={e => handleContactChange(e.target.value)}
                  placeholder="Name, email, or phone…"
                  readOnly={!isOwner}
                  className={`w-full rounded-xl text-sm text-white/70 placeholder-white/15 outline-none transition-all duration-200 px-4 py-2.5 ${
                    isOwner
                      ? 'bg-white/[0.03] border border-white/6 focus:bg-white/[0.05] focus:border-white/12'
                      : 'bg-transparent border border-white/4 cursor-default'
                  }`}
                />
                {!isOwner && <p className="mt-1.5 text-[9px] text-white/18">Project contact</p>}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/[0.05] mb-7" />

        {/* ── EVENTS ── */}
        <div className="px-6 pb-7">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Events</SectionLabel>
            {isOwner && (
              <button
                onClick={openNewEvent}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium border border-green-500/20 bg-green-500/6 text-green-400 hover:bg-green-500/12 hover:border-green-500/35 transition-all duration-200"
                style={{ boxShadow: '0 0 12px rgba(74,222,128,0.08)' }}
              >
                <Plus className="h-3 w-3" /> Add event
              </button>
            )}
          </div>

          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-white/5 bg-white/[0.01]">
              <div className="h-10 w-10 rounded-full border border-white/8 bg-white/3 flex items-center justify-center mb-3">
                <span className="text-lg">🌱</span>
              </div>
              <p className="text-sm text-white/25 font-medium">No events yet</p>
              {isOwner && <p className="text-xs text-white/15 mt-1">Add the first one above</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(evt => (
                <EventRow key={evt.id} evt={evt} isOwner={isOwner} onEdit={openEditEvent} />
              ))}

              {pastEvents.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPastEvents(v => !v)}
                    className="flex items-center gap-2 w-full py-2.5 text-[10px] text-white/22 uppercase tracking-[0.12em] hover:text-white/40 transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showPastEvents ? 'rotate-180' : ''}`} />
                    Past ({pastEvents.length})
                  </button>
                  {showPastEvents && (
                    <div className="space-y-2 animate-fade-in opacity-50">
                      {pastEvents.map(evt => (
                        <EventRow key={evt.id} evt={evt} isOwner={isOwner} onEdit={openEditEvent} past />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/[0.05] mb-7" />

        {/* ── OBSERVATIONS ── */}
        <div className="px-6 pb-7">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Observations</SectionLabel>
            {isAuthenticated && (
              <button
                onClick={() => setShowObsForm(v => !v)}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium border border-white/6 bg-white/[0.02] text-white/30 hover:text-white/55 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
              >
                <Eye className="h-3 w-3" /> Record
              </button>
            )}
          </div>

          {showObsForm && (
            <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-3 animate-fade-up">
              <input
                type="date"
                value={obsDate}
                onChange={e => setObsDate(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/70 outline-none focus:border-white/15 [color-scheme:dark] transition-all"
              />
              <textarea
                autoFocus
                value={obsContent}
                onChange={e => setObsContent(e.target.value)}
                placeholder="What did you observe? Species, plant health, environmental conditions, changes since last visit…"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/75 placeholder-white/18 outline-none focus:border-white/15 leading-relaxed transition-all"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowObsForm(false); setObsContent('') }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/55 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveObservation}
                  disabled={!obsContent.trim() || savingObs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/12 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-40 transition-all"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
              </div>
            </div>
          )}

          {observations.length === 0 && !showObsForm ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-white/5 bg-white/[0.01]">
              <p className="text-sm text-white/20">No observations yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {observations.map(obs => (
                <div key={obs.id} className="group rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.035] hover:border-white/8">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-white/25 font-medium pt-0.5">
                      {new Date(obs.observed_at + 'T12:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {obs.created_by === userId && (
                      <button
                        onClick={() => handleDeleteObservation(obs.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-white/20 hover:text-red-400 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed">{obs.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/[0.05] mb-7" />

        {/* ── STORY ── */}
        <div className="px-6 pb-10">
          <SectionLabel>Story</SectionLabel>
          <p className="text-[10px] text-white/25 mb-3 leading-relaxed">
            Anyone in the community can contribute to this shared story.
          </p>
          <textarea
            ref={storyRef}
            value={story}
            onChange={e => handleStoryChange(e.target.value)}
            placeholder="Tell the story of this place — how it began, what's been planted, wildlife returning, community that shaped it…"
            readOnly={!isAuthenticated}
            className={`w-full min-h-[140px] resize-none rounded-2xl text-sm text-white/70 placeholder-white/12 outline-none leading-relaxed transition-all duration-200 px-4 py-3.5 ${
              isAuthenticated
                ? 'bg-white/[0.03] border border-white/6 focus:bg-white/[0.05] focus:border-white/12'
                : 'bg-transparent border border-white/4 cursor-default'
            }`}
          />
          {isAuthenticated && <p className="mt-2 text-[9px] text-white/18 tracking-wide">Auto-saves as you type</p>}
        </div>
      </div>

      {/* ── EVENT FORM MODAL ── */}
      <Modal open={showEventForm} onClose={() => setShowEventForm(false)}
        title={editingEventId ? 'Edit event' : 'Add event'} size="lg">
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.14em] text-white/30 font-medium mb-2">Description</label>
            <input
              type="text" value={eventForm.title} autoFocus
              onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What's happening here…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/18 transition-all"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.14em] text-white/30 font-medium mb-2">
              {selectedDate
                ? new Date(selectedDate + 'T12:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : 'Pick a date'}
            </label>
            <div className="add-event-calendar rounded-xl border border-white/8 bg-black/20 overflow-hidden">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={selectedDate || undefined}
                headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
                events={[...fcEvents, ...(selectedDate ? [{ start: selectedDate, display: 'background' as const, backgroundColor: 'rgba(74,222,128,0.18)' }] : [])]}
                dateClick={arg => setSelectedDate(arg.dateStr)}
                height="auto" displayEventTime={false} dayMaxEvents={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.14em] text-white/30 font-medium mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EVENT_TYPE_COLORS) as EventType[]).map(type => {
                const active = type === eventForm.eventType
                return (
                  <button key={type} type="button"
                    onClick={() => setEventForm(f => ({ ...f, eventType: type }))}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 ${
                      active ? 'border-transparent text-white' : 'border-white/8 text-white/35 hover:text-white/60 hover:border-white/12'
                    }`}
                    style={active ? { backgroundColor: EVENT_TYPE_COLORS[type], boxShadow: `0 0 12px ${EVENT_TYPE_COLORS[type]}40` } : {}}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/6">
            {editingEventId && (
              <button onClick={handleDeleteEvent} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-all">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setShowEventForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/55 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSaveEvent} disabled={!eventForm.title || !selectedDate || savingEvent}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium hover:bg-green-500/22 disabled:opacity-40 transition-all"
              style={{ boxShadow: '0 0 12px rgba(74,222,128,0.1)' }}
            >
              <Check className="h-3.5 w-3.5" />
              {editingEventId ? 'Update' : 'Add event'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ── Event row ─────────────────────────────────────────────────────────────────
function EventRow({ evt, isOwner, onEdit, past }: { evt: ProjectEvent; isOwner: boolean; onEdit: (e: ProjectEvent) => void; past?: boolean }) {
  const color = evt.color ?? EVENT_TYPE_COLORS[evt.event_type]
  return (
    <button
      onClick={() => isOwner && onEdit(evt)}
      className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
        isOwner ? 'cursor-pointer hover:bg-white/[0.04] hover:border-white/10' : 'cursor-default'
      } ${past ? 'border-white/4 bg-white/[0.01]' : 'border-white/6 bg-white/[0.02]'}`}
    >
      <span className="h-full w-0.5 rounded-full shrink-0 self-stretch min-h-[20px]" style={{ background: color, opacity: past ? 0.4 : 0.8 }} />
      <span className={`flex-1 text-sm truncate ${past ? 'text-white/40' : 'text-white/65'}`}>{evt.title}</span>
      <span className="text-[10px] text-white/25 shrink-0 tabular-nums">
        {new Date(evt.start_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      {isOwner && !past && <Pencil className="h-2.5 w-2.5 text-white/15 shrink-0" />}
    </button>
  )
}
