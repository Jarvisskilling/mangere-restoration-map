'use client'

import { useState, useEffect } from 'react'
import { X, ImageIcon, FileText, CalendarDays, Info, Trash2, ExternalLink } from 'lucide-react'
import { fetchProjectImages } from '@/services/imageService'
import PhotoUpload from './PhotoUpload'
import StoryEditor from './StoryEditor'
import ProjectCalendar from './ProjectCalendar'
import ProjectMetadata from './ProjectMetadata'
import Button from '@/components/ui/Button'
import { deleteProject } from '@/services/projectService'
import type { Project, ProjectImage } from '@/types'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
  onProjectUpdate: (project: Project) => void
  onProjectDelete: (id: string) => void
  userId?: string
  isAuthenticated: boolean
}

type Tab = 'info' | 'photos' | 'story' | 'calendar'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Overview', icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'photos', label: 'Photos', icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { id: 'story', label: 'Story', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-3.5 w-3.5" /> },
]

export default function ProjectModal({
  project,
  onClose,
  onProjectUpdate,
  onProjectDelete,
  userId,
  isAuthenticated,
}: ProjectModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [images, setImages] = useState<ProjectImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canEdit = isAuthenticated && !!userId
  const isCreator = project?.created_by === userId

  useEffect(() => {
    if (!project) return
    setImagesLoading(true)
    setActiveTab('info')
    fetchProjectImages(project.id).then(data => {
      setImages(data)
      setImagesLoading(false)
    })
  }, [project?.id])

  if (!project) return null

  const handleDelete = async () => {
    try {
      await deleteProject(project.id)
      onProjectDelete(project.id)
      onClose()
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full flex-col bg-[#080808] border-l border-white/8 animate-slide-in-right sm:w-[520px] xl:w-[580px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">{project.name}</h2>
            <p className="mt-0.5 text-xs text-white/35">
              {project.latitude.toFixed(5)}, {project.longitude.toFixed(5)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCreator && !confirmDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-red-400/60 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs text-white/40">Delete?</span>
                <Button variant="danger" size="sm" onClick={handleDelete}>Yes</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-white/8 px-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-white/40 hover:text-white/70'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'photos' && images.length > 0 && (
                <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                  {images.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'info' && (
            <div className="animate-fade-in">
              <ProjectMetadata
                project={project}
                onProjectUpdate={onProjectUpdate}
                canEdit={canEdit}
              />
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="animate-fade-in">
              <PhotoUpload
                projectId={project.id}
                userId={userId ?? ''}
                images={images}
                onImagesChange={setImages}
                canEdit={canEdit}
                loading={imagesLoading}
              />
            </div>
          )}

          {activeTab === 'story' && (
            <div className="animate-fade-in">
              <StoryEditor
                projectId={project.id}
                userId={userId}
                canEdit={canEdit}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="animate-fade-in">
              <ProjectCalendar
                projectId={project.id}
                userId={userId}
                canEdit={canEdit}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAuthenticated && (
          <div className="border-t border-white/8 px-6 py-3">
            <p className="text-xs text-center text-white/30">
              Sign in to upload photos, write stories, and add calendar events
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
