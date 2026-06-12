'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Leaf, MapPin } from 'lucide-react'
import StatCards from '@/components/stats/StatCards'
import ProjectPanel from '@/components/project/ProjectPanel'
import AuthButton from '@/components/auth/AuthButton'
import AuthModal from '@/components/auth/AuthModal'
import AddToMapModal from '@/components/map/AddToMapModal'
import CreateEventFromMapModal from '@/components/map/CreateEventFromMapModal'
import EventDetailModal from '@/components/calendar/EventDetailModal'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/useProjects'
import { useProjectsRealtime } from '@/hooks/useRealtime'
import { createProject } from '@/services/projectService'
import type { Project, CommunityEvent } from '@/types'
import toast from 'react-hot-toast'

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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([])
  const [viewingCommunityEvent, setViewingCommunityEvent] = useState<CommunityEvent | null>(null)

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
      <div className="relative" style={{ height: '75vh', minHeight: '500px', width: '100%' }}>
        <div className="absolute inset-0">
          <MapComponent
            projects={projects}
            communityEvents={communityEvents}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            onEventMarkerClick={setViewingCommunityEvent}
            selectedProjectId={selectedProject?.id}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Navbar */}
        <header
          className="absolute left-3 right-3 top-3 z-[1100] flex items-center justify-between gap-4 rounded-2xl border border-[#5c6f55]/15 bg-[#fffaf1]/82 px-4 py-3 shadow-[0_16px_40px_rgba(68,79,58,0.16)] backdrop-blur-xl sm:left-6 sm:right-6 sm:px-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5f8f49]/12 border border-[#5f8f49]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Leaf className="h-4 w-4 text-[#4f7f3f]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#183225] leading-none">Māngere Taiao Restoration</h1>
              <p className="text-[11px] text-[#183225]/45 leading-none mt-0.5">Auckland, New Zealand</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#183225]/45">
              <MapPin className="h-3 w-3" />
              <span>{projects.length} site{projects.length !== 1 ? 's' : ''}</span>
            </div>
            <AuthButton />
          </div>
        </header>

        {/* Creating overlay */}
        {creatingProject && (
          <div className="absolute inset-0 z-[1050] flex items-center justify-center bg-[#1f2f22]/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-[#5f8f49]/18 bg-[#fffaf1]/88 px-6 py-4 shadow-[0_20px_50px_rgba(68,79,58,0.18)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
              <span className="text-sm text-[#183225]/70">Creating restoration site…</span>
            </div>
          </div>
        )}

        {/* Sign-in prompt */}
        {!isAuthenticated && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1050]">
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 rounded-full border border-[#5f8f49]/25 bg-[#fffaf1]/88 px-5 py-2.5 text-sm font-medium text-[#4f7f3f] shadow-[0_14px_34px_rgba(68,79,58,0.18)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:border-[#5f8f49]/40"
            >
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Sign in to add projects and events
            </button>
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

      {/* ── Auth modal ── */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  )
}
