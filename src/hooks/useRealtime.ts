'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

interface RealtimeCallbacks {
  onProjectInsert?: (project: Project) => void
  onProjectUpdate?: (project: Project) => void
  onProjectDelete?: (id: string) => void
}

export function useProjectsRealtime({
  onProjectInsert,
  onProjectUpdate,
  onProjectDelete,
}: RealtimeCallbacks) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload) => onProjectInsert?.(payload.new as Project)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload) => onProjectUpdate?.(payload.new as Project)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload) => onProjectDelete?.(payload.old.id as string)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onProjectInsert, onProjectUpdate, onProjectDelete])
}
