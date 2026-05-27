import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

export function formatArea(sqm: number): string {
  if (sqm >= 10_000) return `${(sqm / 10_000).toFixed(2)} ha`
  return `${sqm.toLocaleString()} m²`
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy')
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy · h:mm a')
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

export function formatCoords(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latStr}, ${lngStr}`
}
