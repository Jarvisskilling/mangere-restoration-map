'use client'

import { useState } from 'react'
import { TreesIcon, Users, Layers, MapPin, Calendar, Tag, CheckCircle, Clock, Zap, Pencil, Check, X } from 'lucide-react'
import { updateProject } from '@/services/projectService'
import type { Project, ProjectType, ProjectStatus } from '@/types'
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_COLORS } from '@/types'
import { formatDate, formatArea, formatCoords } from '@/utils/formatters'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

interface ProjectMetadataProps {
  project: Project
  onProjectUpdate: (project: Project) => void
  canEdit: boolean
}

export default function ProjectMetadata({ project, onProjectUpdate, canEdit }: ProjectMetadataProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    trees_planted: project.trees_planted,
    area_sqm: project.area_sqm,
    contributor_count: project.contributor_count,
    project_type: project.project_type as ProjectType,
    status: project.status as ProjectStatus,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProject(project.id, form)
      onProjectUpdate(updated)
      setEditing(false)
      toast.success('Project updated')
    } catch {
      toast.error('Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      name: project.name,
      description: project.description ?? '',
      trees_planted: project.trees_planted,
      area_sqm: project.area_sqm,
      contributor_count: project.contributor_count,
      project_type: project.project_type,
      status: project.status,
    })
    setEditing(false)
  }

  const statusColor = PROJECT_STATUS_COLORS[project.status]

  return (
    <div className="space-y-4">
      {/* Header: name + edit */}
      {editing ? (
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-green-500/40"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Project description…"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 placeholder-white/25 outline-none focus:border-green-500/40"
          />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            {project.description && (
              <p className="mt-1 text-sm text-white/50 leading-relaxed">{project.description}</p>
            )}
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="shrink-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Status + Type badges */}
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
              className="rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={form.project_type}
              onChange={e => setForm(f => ({ ...f, project_type: e.target.value as ProjectType }))}
              className="rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-xs text-white outline-none"
            >
              {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#111]">{v}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ color: statusColor, background: `${statusColor}15` }}
            >
              {project.status === 'active' ? <Zap className="h-3 w-3" /> : project.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
              <Tag className="h-3 w-3" />
              {PROJECT_TYPE_LABELS[project.project_type]}
            </span>
          </>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            icon: <TreesIcon className="h-4 w-4 text-green-400" />,
            label: 'Trees',
            value: editing ? (
              <input
                type="number"
                min="0"
                value={form.trees_planted}
                onChange={e => setForm(f => ({ ...f, trees_planted: Number(e.target.value) }))}
                className="w-full rounded border border-white/10 bg-transparent text-sm text-white outline-none text-center"
              />
            ) : (
              <span>{project.trees_planted.toLocaleString()}</span>
            ),
          },
          {
            icon: <Users className="h-4 w-4 text-blue-400" />,
            label: 'Contributors',
            value: editing ? (
              <input
                type="number"
                min="0"
                value={form.contributor_count}
                onChange={e => setForm(f => ({ ...f, contributor_count: Number(e.target.value) }))}
                className="w-full rounded border border-white/10 bg-transparent text-sm text-white outline-none text-center"
              />
            ) : (
              <span>{project.contributor_count.toLocaleString()}</span>
            ),
          },
          {
            icon: <Layers className="h-4 w-4 text-purple-400" />,
            label: 'Area',
            value: editing ? (
              <input
                type="number"
                min="0"
                value={form.area_sqm}
                onChange={e => setForm(f => ({ ...f, area_sqm: Number(e.target.value) }))}
                className="w-full rounded border border-white/10 bg-transparent text-xs text-white outline-none text-center"
              />
            ) : (
              <span>{formatArea(project.area_sqm)}</span>
            ),
          },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/2 p-3 text-center">
            <div className="mb-1 flex justify-center">{stat.icon}</div>
            <div className="text-sm font-semibold text-white">{stat.value}</div>
            <div className="text-xs text-white/35">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Location + date */}
      <div className="space-y-2 text-xs text-white/35">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono">{formatCoords(project.latitude, project.longitude)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Created {formatDate(project.created_at)}</span>
          {project.creator?.full_name && (
            <span className="text-white/25">by {project.creator.full_name}</span>
          )}
        </div>
      </div>

      {/* Edit actions */}
      {editing && (
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
            <Check className="h-3.5 w-3.5" /> Save changes
          </Button>
        </div>
      )}
    </div>
  )
}
