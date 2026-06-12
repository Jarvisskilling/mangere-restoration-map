'use client'

import { Trees, Users, Layers } from 'lucide-react'
import { useStatistics } from '@/hooks/useStatistics'
import { formatNumber, formatArea } from '@/utils/formatters'
import { StatCardSkeleton } from '@/components/ui/LoadingSkeleton'

interface StatCard {
  icon: React.ReactNode
  label: string
  value: string
  subLabel?: string
  color: string
}

export default function StatCards() {
  const { stats, loading } = useStatistics()

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  const cards: StatCard[] = [
    {
      icon: <Trees className="h-4 w-4" />,
      label: 'Trees Planted',
      value: formatNumber(stats?.total_trees_planted ?? 0),
      color: '#22c55e',
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Volunteers',
      value: formatNumber(stats?.total_volunteers ?? 0),
      color: '#3b82f6',
    },
    {
      icon: <Layers className="h-4 w-4" />,
      label: 'Area Restored',
      value: formatArea(stats?.total_area_sqm ?? 0),
      color: '#a855f7',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-3xl border border-[#5c6f55]/13 bg-[#fffaf1]/78 p-4 shadow-[0_14px_36px_rgba(68,79,58,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#5c6f55]/22 hover:bg-white"
        >
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(ellipse at top left, ${card.color}18 0%, transparent 70%)`,
            }}
          />
          <div className="relative">
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
              style={{ color: card.color, background: `${card.color}15` }}
            >
              {card.icon}
              {card.label}
            </div>
            <div className="text-2xl font-bold text-[#183225] tracking-tight">
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
