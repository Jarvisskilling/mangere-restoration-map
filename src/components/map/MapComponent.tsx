'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, Layers, X } from 'lucide-react'
import type { Project, CommunityEvent } from '@/types'
import { PROJECT_STATUS_COLORS, EVENT_TYPE_COLORS } from '@/types'

interface MapComponentProps {
  projects: Project[]
  communityEvents?: CommunityEvent[]
  onMapClick: (lat: number, lng: number) => void
  onMarkerClick: (project: Project) => void
  onEventMarkerClick?: (event: CommunityEvent) => void
  selectedProjectId?: string | null
  isAuthenticated: boolean
}

const MANGERE_CENTER: [number, number] = [-37.0, 174.8]
const PROJECT_TYPES = ['all', 'restoration', 'planting', 'cleanup', 'monitoring', 'education']

function createMarkerIcon(color: string, selected: boolean): L.DivIcon {
  const size = selected ? 40 : 30
  const r = size / 2
  const inner = selected ? 9 : 5.5
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" fill-opacity="${selected ? 0.22 : 0.12}" stroke="${color}" stroke-width="${selected ? 2 : 1.5}"/>
    <circle cx="${r}" cy="${r}" r="${inner}" fill="${color}"/>
    ${selected ? `<circle cx="${r}" cy="${r}" r="3.5" fill="white" fill-opacity="0.85"/>` : ''}
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [r, r] })
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count > 99 ? 56 : count > 9 ? 48 : 40
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1.5"/>
    <text x="${size / 2}" y="${size / 2 + 4.5}" text-anchor="middle" fill="#22c55e" font-size="${count > 99 ? 12 : 13}" font-weight="600" font-family="system-ui,sans-serif">${count}</text>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

function ClickHandler({ onMapClick, isAuthenticated }: { onMapClick: (lat: number, lng: number) => void; isAuthenticated: boolean }) {
  useMapEvents({
    click(e) {
      if (isAuthenticated) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapController({
  selectedProjectId,
  projects,
  searchQuery,
}: {
  selectedProjectId?: string | null
  projects: Project[]
  searchQuery: string
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedProjectId) return
    const p = projects.find(x => x.id === selectedProjectId)
    if (p) map.panTo([p.latitude, p.longitude], { animate: true })
  }, [selectedProjectId, projects, map])

  useEffect(() => {
    if (!searchQuery.trim()) return
    // Viewbox covers greater Auckland area
    const viewbox = '174.5,-36.7,175.2,-37.3'
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&viewbox=${viewbox}&bounded=0&limit=1&addressdetails=1`
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const lat = parseFloat(data[0].lat)
          const lon = parseFloat(data[0].lon)
          // Use bounding box zoom level if available, otherwise default to 15
          if (data[0].boundingbox) {
            const [s, n, w, e] = data[0].boundingbox.map(Number)
            map.fitBounds([[s, w], [n, e]], { animate: true, padding: [40, 40] })
          } else {
            map.setView([lat, lon], 15, { animate: true })
          }
        }
      })
      .catch(() => {})
  }, [searchQuery, map])

  return null
}

export default function MapComponent({
  projects,
  communityEvents = [],
  onMapClick,
  onMarkerClick,
  onEventMarkerClick,
  selectedProjectId,
  isAuthenticated,
}: MapComponentProps) {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [clickHint, setClickHint] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setClickHint(false), 5000)
    return () => clearTimeout(t)
  }, [])

  const filtered = filterType === 'all' ? projects : projects.filter(p => p.project_type === filterType)

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MANGERE_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <InvalidateSize />
        <ZoomControl position="bottomleft" />
        <ClickHandler onMapClick={onMapClick} isAuthenticated={isAuthenticated} />
        <MapController selectedProjectId={selectedProjectId} projects={projects} searchQuery={searchQuery} />

        <MarkerClusterGroup
          iconCreateFunction={createClusterIcon}
          showCoverageOnHover={false}
          maxClusterRadius={60}
          chunkedLoading
        >
          {filtered.map(project => (
            <Marker
              key={project.id}
              position={[project.latitude, project.longitude]}
              icon={createMarkerIcon(
                PROJECT_STATUS_COLORS[project.status] ?? '#22c55e',
                project.id === selectedProjectId
              )}
              eventHandlers={{ click: () => onMarkerClick(project) }}
              title={project.name}
            />
          ))}

          {communityEvents
            .filter(e => e.latitude != null && e.longitude != null)
            .map(evt => (
              <Marker
                key={`evt-${evt.id}`}
                position={[evt.latitude!, evt.longitude!]}
                icon={createMarkerIcon(evt.color ?? EVENT_TYPE_COLORS[evt.event_type], false)}
                title={`${evt.title}${evt.location ? ` · ${evt.location}` : ''}`}
                eventHandlers={onEventMarkerClick ? { click: () => onEventMarkerClick(evt) } : undefined}
              />
            ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Search + filter — outer div is pointer-events-none so only the actual inputs receive clicks */}
      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center gap-3 max-w-2xl mx-auto" style={{ zIndex: 1200 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#183225]/42" />
          <input
            type="text"
            placeholder="Search locations in Māngere…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSearchQuery(searchInput) }}
            className="pointer-events-auto w-full rounded-2xl border border-[#5c6f55]/16 bg-[#fffaf1]/88 py-2.5 pl-10 pr-4 text-sm text-[#183225] placeholder-[#183225]/38 shadow-[0_12px_34px_rgba(68,79,58,0.16)] backdrop-blur-xl outline-none transition focus:border-[#5f8f49]/45 focus:bg-white"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchQuery('') }}
              className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-[#183225]/35 hover:text-[#183225]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Layers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#183225]/42" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="pointer-events-auto appearance-none rounded-2xl border border-[#5c6f55]/16 bg-[#fffaf1]/88 py-2.5 pl-9 pr-8 text-sm text-[#183225] shadow-[0_12px_34px_rgba(68,79,58,0.16)] backdrop-blur-xl outline-none cursor-pointer"
          >
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t} className="bg-[#fffaf1] text-[#183225]">
                {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Click hint */}
      {isAuthenticated && clickHint && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 animate-fade-up">
          <div className="rounded-full border border-[#5f8f49]/20 bg-[#fffaf1]/88 px-4 py-2 text-xs font-medium text-[#4f7f3f] shadow-[0_12px_30px_rgba(68,79,58,0.14)] backdrop-blur-xl">
            Click anywhere on the map to add a project or event
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2">
          <div className="rounded-full border border-[#5c6f55]/14 bg-[#fffaf1]/88 px-4 py-2 text-xs text-[#183225]/55 shadow-[0_12px_30px_rgba(68,79,58,0.14)] backdrop-blur-xl">
            Sign in to add restoration sites
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="absolute right-4 top-20 z-[1000]">
          <div className="rounded-xl border border-[#5c6f55]/14 bg-[#fffaf1]/86 px-3 py-1.5 text-xs font-medium text-[#183225]/58 shadow-[0_12px_30px_rgba(68,79,58,0.12)] backdrop-blur-xl">
            {projects.length} site{projects.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
