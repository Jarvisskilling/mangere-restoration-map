'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Check, Calendar, FileText, Trash2, Tag, Bell, BellOff,
  Users, TreePine, Clock, MapPin, Eye, Plus, ChevronDown, ChevronUp, Pencil,
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

function StatBox({
  icon, label, value, editable, onChange,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  editable?: boolean
  onChange?: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n !== Number(value)) onChange?.(n)
  }

  if (editable && editing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-white/30">{icon}</div>
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-16 bg-white/10 border border-green-500/40 rounded px-1 py-0.5 text-center text-sm text-white outline-none"
        />
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
    )
  }

  return (
    <button
      className={`flex flex-col items-center gap-1 ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      onClick={() => { if (editable) { setDraft(String(value)); setEditing(true) } }}
      title={editable ? `Click to edit ${label}` : undefined}
    >
      <div className="text-white/30">{icon}</div>
      <span className="text-base font-bold text-white">{Number(value).toLocaleString()}</span>
      <span className="text-[10px] text-white/30">{label}</span>
    </button>
  )
}

export default function ProjectPanel({
  project,
  onClose,
  onProjectUpdate,
  onProjectDelete,
  userId,
  isAuthenticated,
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

  // Event form
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT)
  const [selectedDate, setSelectedDate] = useState('')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)

  // Observation form
  const [showObsForm, setShowObsForm] = useState(false)
  const [obsContent, setObsContent] = useState('')
  const [obsDate, setObsDate] = useState(today)
  const [savingObs, setSavingObs] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const storyRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const descAutoSave = useRef<ReturnType<typeof setTimeout>>()
  const contactAutoSave = useRef<ReturnType<typeof setTimeout>>()

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
      try { await upsertProjectStory(project.id, val, userId) }
      catch { toast.error('Failed to save story') }
    }, 1500)
  }

  const handleDescriptionChange = (val: string) => {
    setDescription(val)
    clearTimeout(descAutoSave.current)
    descAutoSave.current = setTimeout(async () => {
      try {
        const updated = await updateProject(project.id, { description: val || null })
        onProjectUpdate(updated)
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
    const prevType = projectType
    const prevName = name
    setProjectType(type)
    const isDefaultName = Object.values(PROJECT_TYPE_DEFAULT_NAMES).includes(name)
    const newName = isDefaultName ? PROJECT_TYPE_DEFAULT_NAMES[type] : name
    if (isDefaultName) setName(newName)
    try {
      const updated = await updateProject(project.id, {
        project_type: type,
        ...(isDefaultName ? { name: newName } : {}),
      })
      onProjectUpdate(updated)
    } catch {
      toast.error('Failed to update type')
      setProjectType(prevType)
      if (isDefaultName) setName(prevName)
    }
  }

  const handleStatUpdate = async (field: 'trees_planted' | 'volunteer_hours', val: number) => {
    if (field === 'trees_planted') setTrees(val)
    else setHours(val)
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
        await unfollowProject(project.id, userId)
        setIsFollowing(false)
        setFollowerCount(c => Math.max(0, c - 1))
        toast('Unfollowed', { icon: '👋' })
      } else {
        await followProject(project.id, userId)
        setIsFollowing(true)
        setFollowerCount(c => c + 1)
        toast.success("Following — you'll be notified when events are added")
      }
    } catch { toast.error('Failed to update follow') }
    finally { setFollowLoading(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteProject(project.id)
      onProjectDelete(project.id)
      onClose()
      toast.success('Site deleted')
    } catch { toast.error('Failed to delete') }
  }

  const openNewEvent = () => {
    setEditingEventId(null)
    setSelectedDate('')
    setEventForm(EMPTY_EVENT)
    setShowEventForm(true)
  }

  const openEditEvent = useCallback((evt: ProjectEvent) => {
    setEditingEventId(evt.id)
    setSelectedDate(evt.start_date.slice(0, 10))
    setEventForm({ title: evt.title, eventType: evt.event_type, allDay: evt.all_day })
    setShowEventForm(true)
  }, [])

  const handleSaveEvent = async () => {
    if (!eventForm.title || !selectedDate) return
    setSavingEvent(true)
    const start_date = `${selectedDate}T${eventForm.allDay ? '00:00:00' : '09:00:00'}`
    try {
      if (editingEventId) {
        const updated = await updateProjectEvent(editingEventId, {
          title: eventForm.title,
          start_date,
          event_type: eventForm.eventType,
          all_day: eventForm.allDay,
          color: EVENT_TYPE_COLORS[eventForm.eventType],
        })
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
        toast.success('Event updated')
      } else {
        const created = await createProjectEvent({
          project_id: project.id,
          title: eventForm.title,
          start_date,
          event_type: eventForm.eventType,
          all_day: eventForm.allDay,
          color: EVENT_TYPE_COLORS[eventForm.eventType],
          created_by: userId,
        })
        setEvents(prev => [...prev, created])
        toast.success('Event added')
      }
      setShowEventForm(false)
    } catch { toast.error('Failed to save event') }
    finally { setSavingEvent(false) }
  }

  const handleDeleteEvent = async () => {
    if (!editingEventId) return
    try {
      await deleteProjectEvent(editingEventId)
      setEvents(prev => prev.filter(e => e.id !== editingEventId))
      setShowEventForm(false)
      toast.success('Event removed')
    } catch { toast.error('Failed to delete event') }
  }

  const handleSaveObservation = async () => {
    if (!obsContent.trim()) return
    setSavingObs(true)
    try {
      const created = await createProjectObservation({
        project_id: project.id,
        content: obsContent.trim(),
        observed_at: obsDate,
        created_by: userId,
      })
      setObservations(prev => [created, ...prev])
      setObsContent('')
      setObsDate(today)
      setShowObsForm(false)
      toast.success('Observation recorded')
    } catch { toast.error('Failed to save observation') }
    finally { setSavingObs(false) }
  }

  const handleDeleteObservation = async (id: string) => {
    try {
      await deleteProjectObservation(id)
      setObservations(prev => prev.filter(o => o.id !== id))
    } catch { toast.error('Failed to delete') }
  }

  const upcomingEvents = events
    .filter(e => e.start_date.slice(0, 10) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const pastEvents = events
    .filter(e => e.start_date.slice(0, 10) < today)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start_date,
    end: e.end_date ?? undefined,
    allDay: e.all_day,
    backgroundColor: e.color ?? EVENT_TYPE_COLORS[e.event_type],
    borderColor: 'transparent',
    extendedProps: e,
  }))

  return (
    <>
      <div className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-[1500] flex w-full flex-col bg-[#080808] border-l border-white/10 animate-slide-in-right sm:w-[500px] overflow-y-auto">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 border-b border-white/8 bg-[#080808] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                className="w-full bg-transparent text-base font-semibold text-white outline-none border-b border-transparent focus:border-green-500/40 transition-colors pb-0.5"
                placeholder="Site name…"
              />
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-white/20" />
                <p className="text-xs text-white/30">
                  {project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}
                </p>
                {project.creator?.full_name && (
                  <span className="text-xs text-white/20">· by {project.creator.full_name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isAuthenticated && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  title={isFollowing ? 'Unfollow project' : 'Follow project'}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    isFollowing
                      ? 'bg-green-500/15 text-green-400 hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isFollowing ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                  {isFollowing ? 'Following' : 'Follow'}
                  {followerCount > 0 && <span className="opacity-60">{followerCount}</span>}
                </button>
              )}
              {isOwner && !confirmDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 text-white/20 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {isOwner && confirmDelete && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-white/40">Delete?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>Yes</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
                </div>
              )}
              <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Type pills ── */}
        <div className="px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-white/40 uppercase tracking-wider">
            <Tag className="h-3.5 w-3.5" />
            Site type
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map(type => {
              const active = type === projectType
              return (
                <button
                  key={type}
                  onClick={() => isOwner && handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    active
                      ? 'border-transparent text-black'
                      : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                  } ${!isOwner ? 'cursor-default' : ''}`}
                  style={active ? { backgroundColor: PROJECT_TYPE_COLORS[type] } : {}}
                >
                  {PROJECT_TYPE_LABELS[type]}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="px-5 py-4 border-b border-white/8">
          <div className="grid grid-cols-4 gap-2">
            <StatBox
              icon={<TreePine className="h-4 w-4" />}
              label="trees"
              value={trees}
              editable={isOwner}
              onChange={v => handleStatUpdate('trees_planted', v)}
            />
            <StatBox
              icon={<span className="text-xs text-white/30">m²</span>}
              label="area"
              value={project.area_sqm}
            />
            <StatBox
              icon={<Users className="h-4 w-4" />}
              label="volunteers"
              value={project.contributor_count}
            />
            <StatBox
              icon={<Clock className="h-4 w-4" />}
              label="hours"
              value={hours}
              editable={isOwner}
              onChange={v => handleStatUpdate('volunteer_hours', v)}
            />
          </div>
          {isOwner && <p className="mt-2 text-center text-[10px] text-white/20">Click trees or hours to update</p>}
        </div>

        {/* ── Overview ── */}
        <div className="px-5 py-5 border-b border-white/8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5" />
            Overview
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/30">About this site</label>
            <textarea
              value={description}
              onChange={e => handleDescriptionChange(e.target.value)}
              placeholder="Describe this restoration site — location, ecosystem, community involvement…"
              rows={3}
              readOnly={!isOwner}
              className={`w-full resize-none rounded-xl border border-white/8 px-4 py-3 text-sm text-white/80 placeholder-white/20 outline-none leading-relaxed transition ${
                isOwner ? 'bg-white/3 focus:border-green-500/30 focus:bg-white/5' : 'bg-transparent cursor-default'
              }`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/30">Contact</label>
            <input
              type="text"
              value={contact}
              onChange={e => handleContactChange(e.target.value)}
              placeholder="Name, email, or phone number…"
              readOnly={!isOwner}
              className={`w-full rounded-lg border border-white/8 px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none transition ${
                isOwner ? 'bg-white/3 focus:border-green-500/30 focus:bg-white/5' : 'bg-transparent cursor-default'
              }`}
            />
          </div>
          {isOwner && <p className="text-xs text-white/20">Auto-saves as you type</p>}
        </div>

        {/* ── Events ── */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              Events
            </div>
            {isOwner && (
              <Button variant="primary" size="sm" onClick={openNewEvent}>
                <Plus className="h-3.5 w-3.5" /> Add event
              </Button>
            )}
          </div>

          {upcomingEvents.length === 0 && pastEvents.length === 0 && (
            <p className="text-sm text-white/25 text-center py-4">No events yet</p>
          )}

          {upcomingEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Upcoming</p>
              {upcomingEvents.map(evt => (
                <button
                  key={evt.id}
                  onClick={() => isOwner && openEditEvent(evt)}
                  className={`w-full flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 px-3 py-2.5 text-left transition-colors ${isOwner ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: evt.color ?? EVENT_TYPE_COLORS[evt.event_type] }} />
                  <span className="flex-1 text-sm text-white/70 truncate">{evt.title}</span>
                  <span className="text-xs text-white/30 shrink-0">
                    {new Date(evt.start_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {isOwner && <Pencil className="h-3 w-3 text-white/20" />}
                </button>
              ))}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowPastEvents(v => !v)}
                className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider mb-2 hover:text-white/50 transition-colors"
              >
                {showPastEvents ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Past events ({pastEvents.length})
              </button>
              {showPastEvents && (
                <div className="space-y-2">
                  {pastEvents.map(evt => (
                    <button
                      key={evt.id}
                      onClick={() => isOwner && openEditEvent(evt)}
                      className={`w-full flex items-center gap-3 rounded-lg border border-white/5 bg-white/1 px-3 py-2.5 text-left transition-colors opacity-60 ${isOwner ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: evt.color ?? EVENT_TYPE_COLORS[evt.event_type] }} />
                      <span className="flex-1 text-sm text-white/60 truncate">{evt.title}</span>
                      <span className="text-xs text-white/25 shrink-0">
                        {new Date(evt.start_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Observations ── */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              <Eye className="h-3.5 w-3.5" />
              Observations
            </div>
            {isAuthenticated && (
              <button
                onClick={() => setShowObsForm(v => !v)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>

          {showObsForm && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="date"
                    value={obsDate}
                    onChange={e => setObsDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-green-500/40 [color-scheme:dark]"
                  />
                </div>
              </div>
              <textarea
                autoFocus
                value={obsContent}
                onChange={e => setObsContent(e.target.value)}
                placeholder="What did you observe? Species spotted, plant health, environmental conditions…"
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-green-500/40"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowObsForm(false); setObsContent('') }}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveObservation} loading={savingObs} disabled={!obsContent.trim()}>
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
          )}

          {observations.length === 0 && !showObsForm && (
            <p className="text-sm text-white/25 text-center py-4">No observations recorded yet</p>
          )}

          <div className="space-y-3">
            {observations.map(obs => (
              <div key={obs.id} className="group relative rounded-lg border border-white/8 bg-white/2 px-3 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">
                    {new Date(obs.observed_at + 'T12:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {obs.created_by === userId && (
                    <button
                      onClick={() => handleDeleteObservation(obs.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{obs.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Story ── */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-white/40 uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5" />
            Story
          </div>
          <textarea
            ref={storyRef}
            value={story}
            onChange={e => handleStoryChange(e.target.value)}
            placeholder="Tell the story of this site — how it started, milestones reached, what's been planted, wildlife returning…"
            readOnly={!isOwner}
            className={`w-full min-h-[120px] resize-none rounded-xl border border-white/8 px-4 py-3 text-sm text-white/80 placeholder-white/20 outline-none leading-relaxed transition ${
              isOwner ? 'bg-white/3 focus:border-green-500/30 focus:bg-white/5' : 'bg-transparent cursor-default'
            }`}
          />
          {isOwner && <p className="mt-1.5 text-xs text-white/20">Auto-saves as you type</p>}
        </div>

        {/* ── Bottom padding ── */}
        <div className="h-8" />
      </div>

      {/* ── Event form modal ── */}
      <Modal
        open={showEventForm}
        onClose={() => setShowEventForm(false)}
        title={editingEventId ? 'Edit event' : 'Add event'}
        size="lg"
      >
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40 uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={eventForm.title}
              onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What's happening here…"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-green-500/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40 uppercase tracking-wider">
              {selectedDate
                ? `Date · ${new Date(selectedDate + 'T12:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Pick a date'}
            </label>
            <div className="add-event-calendar rounded-xl border border-white/8 bg-black/20 overflow-hidden">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={selectedDate || undefined}
                headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
                events={[
                  ...fcEvents,
                  ...(selectedDate ? [{ start: selectedDate, display: 'background' as const, backgroundColor: 'rgba(34,197,94,0.22)' }] : []),
                ]}
                dateClick={arg => setSelectedDate(arg.dateStr)}
                height="auto"
                displayEventTime={false}
                dayMaxEvents={2}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40 uppercase tracking-wider">Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EVENT_TYPE_COLORS) as EventType[]).map(type => {
                const active = type === eventForm.eventType
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventForm(f => ({ ...f, eventType: type }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      active ? 'border-transparent text-white' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                    style={active ? { backgroundColor: EVENT_TYPE_COLORS[type] } : {}}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {editingEventId && (
              <Button variant="danger" size="sm" onClick={handleDeleteEvent}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowEventForm(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEvent}
              loading={savingEvent}
              disabled={!eventForm.title || !selectedDate}
            >
              <Check className="h-3.5 w-3.5" />
              {editingEventId ? 'Update' : 'Add event'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
