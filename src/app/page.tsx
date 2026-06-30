'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Layers, Leaf, MapPin, Search, X } from 'lucide-react'
import StatCards from '@/components/stats/StatCards'
import ProjectPanel from '@/components/project/ProjectPanel'
import AuthButton from '@/components/auth/AuthButton'
import AddToMapModal from '@/components/map/AddToMapModal'
import CreateEventFromMapModal from '@/components/map/CreateEventFromMapModal'
import EventDetailModal from '@/components/calendar/EventDetailModal'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/useProjects'
import { useProjectsRealtime } from '@/hooks/useRealtime'
import { createProject } from '@/services/projectService'
import type { Project, CommunityEvent } from '@/types'
import toast from 'react-hot-toast'

const PROJECT_TYPES = ['all', 'restoration', 'planting', 'cleanup', 'monitoring', 'education']

const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
      <div className="flex h-full items-center justify-center bg-[#f5f1e8]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
        <p className="text-sm text-[#183225]/45">Loading map…</p>
      </div>
    </div>
  ),
})

const CommunityCalendar = dynamic(() => import('@/components/calendar/CommunityCalendar'), {
  ssr: false,
})

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const { projects, addProject, updateProject, removeProject } = useProjects()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([])
  const [viewingCommunityEvent, setViewingCommunityEvent] = useState<CommunityEvent | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Map-click flow: pending location → choice modal → project or event
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showCreateEvent, setShowCreateEvent] = useState(false)

  useProjectsRealtime({
    onProjectInsert: useCallback(
      (p: Project) => { if (!projects.find(x => x.id === p.id)) addProject(p) },
      [projects, addProject]
    ),
    onProjectUpdate: updateProject,
    onProjectDelete: removeProject,
  })

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!isAuthenticated || !user) return
    setPendingLocation({ lat, lng })
  }, [isAuthenticated, user])

  const handleCreateProject = useCallback(async () => {
    if (!pendingLocation || !user || creatingProject) return
    const loc = pendingLocation
    setPendingLocation(null)
    setCreatingProject(true)
    try {
      const project = await createProject(loc.lat, loc.lng, user.id)
      addProject(project)
      setSelectedProject(project)
      toast.success('Restoration site created!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err)
      toast.error(`Failed: ${msg}`)
    } finally {
      setCreatingProject(false)
    }
  }, [pendingLocation, user, creatingProject, addProject])

  const handleChooseEvent = useCallback(() => {
    setShowCreateEvent(true)
  }, [])

  const handleEventCreated = useCallback((evt: CommunityEvent) => {
    setCommunityEvents(prev => [...prev, evt])
  }, [])

  const handleMarkerClick = useCallback((project: Project) => {
    setSelectedProject(project)
  }, [])

  const handleProjectUpdate = useCallback((updated: Project) => {
    updateProject(updated)
    setSelectedProject(updated)
  }, [updateProject])

  const handleProjectDelete = useCallback((id: string) => {
    removeProject(id)
    if (selectedProject?.id === id) setSelectedProject(null)
  }, [removeProject, selectedProject])

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#183225]">

      {/* ── Map section ── */}
      <div className="relative h-[78svh] min-h-[560px] w-full sm:h-[80vh] sm:min-h-[540px]">
        <div className="absolute inset-0">
          <MapComponent
            projects={projects}
            communityEvents={communityEvents}
            searchQuery={searchQuery}
            filterType={filterType}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            onEventMarkerClick={setViewingCommunityEvent}
            selectedProjectId={selectedProject?.id}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Compact map controls */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1200] px-3 pt-3 sm:px-5 sm:pt-5">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <header className="pointer-events-auto flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/60 bg-[#fffaf1]/82 px-3 py-2.5 shadow-[0_14px_36px_rgba(68,79,58,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl lg:w-[410px]">
              <div className="flex min-w-0 items-center gap-2.5 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#5f8f49]/20 bg-[#5f8f49]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Leaf className="h-4 w-4 text-[#4f7f3f]" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold leading-none text-[#183225] sm:text-base">Māngere Taiao Restoration</h1>
                  <p className="mt-1 truncate text-[11px] leading-none text-[#183225]/48">Auckland, New Zealand</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="hidden items-center gap-1 rounded-full border border-[#5c6f55]/12 bg-white/48 px-2.5 py-1 text-xs text-[#183225]/52 sm:flex">
                  <MapPin className="h-3 w-3" />
                  <span>{projects.length} site{projects.length !== 1 ? 's' : ''}</span>
                </div>
                <AuthButton />
              </div>
            </header>

            <form
              className="pointer-events-auto grid w-full grid-cols-[minmax(0,1fr)_118px] gap-2 rounded-2xl border border-white/60 bg-[#fffaf1]/82 p-2 shadow-[0_14px_36px_rgba(68,79,58,0.16),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl sm:grid-cols-[minmax(0,1fr)_170px] lg:max-w-[680px]"
              onSubmit={e => {
                e.preventDefault()
                setSearchQuery(searchInput)
              }}
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#183225]/42" />
                <input
                  type="text"
                  placeholder="Search Māngere…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#5c6f55]/14 bg-white/66 pl-10 pr-16 text-[16px] text-[#183225] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[#183225]/38 focus:border-[#5f8f49]/38 focus:bg-white focus:shadow-[0_0_0_4px_rgba(95,143,73,0.08)] sm:pr-20 sm:text-sm"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); setSearchQuery('') }}
                    className="absolute right-10 top-1/2 rounded-full p-1 text-[#183225]/38 transition-[background-color,color,transform] duration-150 ease-out hover:bg-[#5f8f49]/10 hover:text-[#183225] active:scale-95 sm:right-12"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 flex h-7 min-w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#5f8f49] px-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(95,143,73,0.22)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-[#4f7f3f] active:scale-[0.97] sm:h-8 sm:min-w-9 sm:px-3"
                  aria-label="Search map"
                >
                  Go
                </button>
              </div>

              <div className="relative">
                <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#183225]/42" />
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-[#5c6f55]/14 bg-white/66 pl-8 pr-2 text-[16px] text-[#183225] outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-[#5f8f49]/38 focus:bg-white focus:shadow-[0_0_0_4px_rgba(95,143,73,0.08)] sm:pl-9 sm:pr-4 sm:text-sm"
                >
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-[#fffaf1] text-[#183225]">
                      {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>
        </div>

        {/* Creating overlay */}
        {creatingProject && (
          <div className="absolute inset-0 z-[1050] flex items-center justify-center bg-[#1f2f22]/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-[#5f8f49]/18 bg-[#fffaf1]/88 px-6 py-4 shadow-[0_20px_50px_rgba(68,79,58,0.18)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
              <span className="text-sm text-[#183225]/70">Creating restoration site…</span>
            </div>
          </div>
        )}

      </div>

      {/* ── Community calendar ── */}
      <CommunityCalendar
        userId={user?.id}
        isAuthenticated={isAuthenticated}
        onEventsChange={setCommunityEvents}
      />

      {/* ── Stat cards ── */}
      <div className="border-t border-[#5c6f55]/12 bg-[#efe8dc] px-6 py-8">
        <StatCards />
      </div>

      {/* ── Project panel ── */}
      {selectedProject && (
        <ProjectPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdate={handleProjectUpdate}
          onProjectDelete={handleProjectDelete}
          userId={user?.id}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* ── Add to map: choose Project or Event ── */}
      {pendingLocation && !showCreateEvent && (
        <AddToMapModal
          open={!!pendingLocation}
          lat={pendingLocation.lat}
          lng={pendingLocation.lng}
          onClose={() => setPendingLocation(null)}
          onCreateProject={handleCreateProject}
          onCreateEvent={handleChooseEvent}
        />
      )}

      {/* ── Create community event from map ── */}
      {pendingLocation && user && (
        <CreateEventFromMapModal
          open={showCreateEvent}
          lat={pendingLocation.lat}
          lng={pendingLocation.lng}
          userId={user.id}
          onClose={() => { setShowCreateEvent(false); setPendingLocation(null) }}
          onEventCreated={evt => { handleEventCreated(evt); setPendingLocation(null) }}
        />
      )}

      {/* ── Community event detail (map marker click) ── */}
      <EventDetailModal
        event={viewingCommunityEvent}
        onClose={() => setViewingCommunityEvent(null)}
        userId={user?.id}
        isAuthenticated={isAuthenticated}
      />
    </div>
  )
}
