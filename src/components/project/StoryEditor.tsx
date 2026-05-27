'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, FileText, Clock } from 'lucide-react'
import { upsertProjectStory, fetchProjectStory } from '@/services/statisticsService'
import Button from '@/components/ui/Button'
import { timeAgo } from '@/utils/formatters'
import { Skeleton } from '@/components/ui/LoadingSkeleton'
import toast from 'react-hot-toast'

interface StoryEditorProps {
  projectId: string
  userId?: string
  canEdit: boolean
}

export default function StoryEditor({ projectId, userId, canEdit }: StoryEditorProps) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetchProjectStory(projectId).then(story => {
      if (story) {
        setContent(story.content)
        setSavedContent(story.content)
        setUpdatedAt(story.updated_at)
      }
      setLoading(false)
    })
  }, [projectId])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 600)}px`
  }, [])

  useEffect(() => { autoResize() }, [content, autoResize])

  const save = useCallback(async (text: string) => {
    if (!userId || !canEdit) return
    setSaving(true)
    try {
      const story = await upsertProjectStory(projectId, text, userId)
      setSavedContent(text)
      setUpdatedAt(story.updated_at)
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }, [projectId, userId, canEdit])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => save(value), 2000)
  }

  const isDirty = content !== savedContent

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="Write your restoration story here…

Document the journey of this site: what was here before, what's been planted, challenges faced, community moments, wildlife sightings, and future plans. Every detail helps build the history of this place.

Use plain text or markdown-style formatting."
            className="min-h-[180px] w-full resize-none rounded-xl border border-white/8 bg-white/3 p-4 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-green-500/30 focus:bg-white/4 leading-relaxed"
            onInput={autoResize}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/30">
              {updatedAt && (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Last saved {timeAgo(updatedAt)}
                </>
              )}
              {saving && <span className="text-green-400/60">Saving…</span>}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => save(content)}
              loading={saving}
              disabled={!isDirty || saving}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </>
      ) : (
        <div>
          {content ? (
            <div className="rounded-xl border border-white/8 bg-white/2 p-4">
              <p className="whitespace-pre-wrap text-sm text-white/70 leading-relaxed">{content}</p>
              {updatedAt && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-white/25">
                  <Clock className="h-3 w-3" />
                  Updated {timeAgo(updatedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-8 w-8 text-white/10" />
              <p className="text-sm text-white/30">No story written yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
