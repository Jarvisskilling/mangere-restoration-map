'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchStatistics } from '@/services/statisticsService'
import type { Statistics } from '@/types'

export function useStatistics() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics().then(data => {
      setStats(data)
      setLoading(false)
    })

    const supabase = createClient()
    const channel = supabase
      .channel('statistics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'statistics' },
        (payload) => {
          setStats(payload.new as Statistics)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { stats, loading }
}
