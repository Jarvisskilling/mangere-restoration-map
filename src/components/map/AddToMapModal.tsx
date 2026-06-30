'use client'

import { MapPin, Calendar } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface AddToMapModalProps {
  open: boolean
  lat: number
  lng: number
  onClose: () => void
  onCreateProject: () => void
  onCreateEvent: () => void
}

export default function AddToMapModal({
  open, lat, lng, onClose, onCreateProject, onCreateEvent,
}: AddToMapModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="What would you like to add?">
      <div className="p-5 space-y-3">
        <p className="text-xs text-white/25 -mt-1 mb-2">{lat.toFixed(5)}, {lng.toFixed(5)}</p>

        <button
          onClick={onCreateProject}
          className="liquid-glass-card group w-full flex items-start gap-4 rounded-xl p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:shadow-[0_14px_30px_rgba(68,79,58,0.12)] active:scale-[0.99]"
        >
          <div className="liquid-glass-control mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors">
            <MapPin className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Restoration Project</div>
            <div className="mt-0.5 text-xs text-white/40 leading-snug">
              A permanent site — track plants, volunteers, stories, and events over time
            </div>
          </div>
        </button>

        <button
          onClick={onCreateEvent}
          className="liquid-glass-card group w-full flex items-start gap-4 rounded-xl p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:shadow-[0_14px_30px_rgba(68,79,58,0.12)] active:scale-[0.99]"
        >
          <div className="liquid-glass-control mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Community Event</div>
            <div className="mt-0.5 text-xs text-white/40 leading-snug">
              A one-time happening with a date — cleanup day, planting session, community gathering
            </div>
          </div>
        </button>
      </div>
    </Modal>
  )
}
