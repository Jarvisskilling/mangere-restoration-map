'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
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
  searchQuery?: string
  filterType?: string
}

const MANGERE_CENTER: [number, number] = [-37.0, 174.8]
const MAP_RENDERER = L.canvas({ padding: 0.35 })

const markerIconCache = new Map<string, L.DivIcon>()

function createMarkerIcon(color: string, selected: boolean): L.DivIcon {
  const cacheKey = `${color}:${selected ? 'selected' : 'default'}`
  const cached = markerIconCache.get(cacheKey)
  if (cached) return cached

  const size = selected ? 40 : 30
  const r = size / 2
  const inner = selected ? 9 : 5.5
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" fill-opacity="${selected ? 0.22 : 0.12}" stroke="${color}" stroke-width="${selected ? 2 : 1.5}"/>
    <circle cx="${r}" cy="${r}" r="${inner}" fill="${color}"/>
    ${selected ? `<circle cx="${r}" cy="${r}" r="3.5" fill="white" fill-opacity="0.85"/>` : ''}
  </svg>`
  const icon = L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [r, r] })
  markerIconCache.set(cacheKey, icon)
  return icon
}

const clusterIconCache = new Map<number, L.DivIcon>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  const cached = clusterIconCache.get(count)
  if (cached) return cached

  const size = count > 99 ? 56 : count > 9 ? 48 : 40
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#22c55e" fill-opacity="0.15" stroke="#22c55e" stroke-width="1.5"/>
    <text x="${size / 2}" y="${size / 2 + 4.5}" text-anchor="middle" fill="#22c55e" font-size="${count > 99 ? 12 : 13}" font-weight="600" font-family="system-ui,sans-serif">${count}</text>
  </svg>`
  const icon = L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
  clusterIconCache.set(count, icon)
  return icon
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
  searchQuery = '',
  filterType = 'all',
}: MapComponentProps) {
  const [clickHint, setClickHint] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setClickHint(false), 5000)
    return () => clearTimeout(t)
  }, [])

  const filtered = useMemo(
    () => filterType === 'all' ? projects : projects.filter(p => p.project_type === filterType),
    [projects, filterType]
  )
  const visibleEvents = useMemo(
    () => communityEvents.filter(e => e.latitude != null && e.longitude != null),
    [communityEvents]
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MANGERE_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={true}
        renderer={MAP_RENDERER}
        preferCanvas={true}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={false}
        inertia={true}
        easeLinearity={0.18}
        wheelDebounceTime={18}
        wheelPxPerZoomLevel={48}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
          keepBuffer={4}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />

        <InvalidateSize />
        <ZoomControl position="bottomleft" />
        <ClickHandler onMapClick={onMapClick} isAuthenticated={isAuthenticated} />
        <MapController selectedProjectId={selectedProjectId} projects={projects} searchQuery={searchQuery} />

        <MarkerClusterGroup
          iconCreateFunction={createClusterIcon}
          showCoverageOnHover={false}
          removeOutsideVisibleBounds
          animate={false}
          maxClusterRadius={54}
          chunkedLoading
          chunkInterval={120}
          chunkDelay={20}
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

          {visibleEvents
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

      {/* Click hint */}
      {isAuthenticated && clickHint && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-up sm:bottom-8">
          <div className="rounded-full border border-[#5f8f49]/20 bg-[#fffaf1]/88 px-4 py-2 text-center text-xs font-medium text-[#4f7f3f] shadow-[0_12px_30px_rgba(68,79,58,0.14)] backdrop-blur-xl">
            Click anywhere on the map to add a project or event
          </div>
        </div>
      )}
    </div>
  )
}
