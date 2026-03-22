const BASE_URL = 'http://localhost:5000'

const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  picture: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  location: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink: string
  calendarId?: string
}

export interface GoogleCalendar {
  id: string
  summary: string
  description: string
  backgroundColor: string
  foregroundColor: string
  primary: boolean
  accessRole: string
}

export interface CreateEventPayload {
  title: string
  description: string
  location: string
  startDateTime: string
  endDateTime: string
}

export interface CreatedEventResponse {
  message: string
  event: {
    id: string
    title: string
    htmlLink: string
    start: { dateTime: string }
    end: { dateTime: string }
  }
}

// ── Supabase Event Types ──────────────────────────────────────────────────────

export interface SupabaseEvent {
  id: string
  title: string
  description: string
  start_datetime: string
  end_datetime: string
  calendar_type: string
  color: string
  created_at: string
  google_event_id?: string | null
  google_calendar_id?: string | null
}

export interface CreateSupabaseEventPayload {
  title: string
  description: string
  start_datetime: string
  end_datetime: string
  calendar_type: string
  color: string
}

// ── Calendar Config ───────────────────────────────────────────────────────────

export const CALENDARS = [
  {
    id: 'Birthdays',
    label: 'Birthdays',
    color: '#ec4899',       // pink-500
    pillClass: 'bg-pink-500/80 text-pink-50',
  },
  {
    id: 'Projects',
    label: 'Projects',
    color: '#3b82f6',       // blue-500
    pillClass: 'bg-blue-500/80 text-blue-50',
  },
  {
    id: 'Events',
    label: 'Events',
    color: '#10b981',       // emerald-500
    pillClass: 'bg-emerald-500/80 text-emerald-50',
  },
] as const

export type CalendarId = (typeof CALENDARS)[number]['id']

const CALENDARS_MAP = new Map(CALENDARS.map(c => [c.id, c]))

export function getCalendarConfig(id: string) {
  return CALENDARS_MAP.get(id as CalendarId) ?? CALENDARS[2]
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export async function getMe(): Promise<User | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, defaultOptions)
    if (!res.ok) return null
    const data = await res.json()
    return data.user as User
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, defaultOptions)
}

export function getGoogleSignInUrl(): string {
  return `${BASE_URL}/auth/google`
}

// ── Google Calendar API ───────────────────────────────────────────────────────

export async function createEvent(
  payload: CreateEventPayload
): Promise<CreatedEventResponse> {
  const res = await fetch(`${BASE_URL}/api/events`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create event')
  }
  return data as CreatedEventResponse
}

export async function getGoogleCalendars(): Promise<GoogleCalendar[]> {
  const res = await fetch(`${BASE_URL}/api/calendars`, defaultOptions)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch calendars')
  return data.calendars as GoogleCalendar[]
}

export async function getUpcomingEvents(
  calendarIds?: string[],
  timeMin?: string,
  timeMax?: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams()
  if (calendarIds && calendarIds.length > 0) {
    params.set('calendarIds', calendarIds.join(','))
  }
  if (timeMin) params.set('timeMin', timeMin)
  if (timeMax) params.set('timeMax', timeMax)
  const qs = params.toString()
  const url = `${BASE_URL}/api/events${qs ? `?${qs}` : ''}`
  const res = await fetch(url, defaultOptions)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch events')
  return data.events as CalendarEvent[]
}

// ── Supabase Events API ───────────────────────────────────────────────────────

export async function getSupabaseEvents(): Promise<SupabaseEvent[]> {
  const res = await fetch(`${BASE_URL}/api/supabase/events`, defaultOptions)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to fetch events')
  return data.events as SupabaseEvent[]
}

export async function createSupabaseEvent(
  payload: CreateSupabaseEventPayload
): Promise<SupabaseEvent> {
  const res = await fetch(`${BASE_URL}/api/supabase/events`, {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create event')
  return data.event as SupabaseEvent
}

export async function updateSupabaseEvent(
  id: string,
  payload: Partial<CreateSupabaseEventPayload>
): Promise<SupabaseEvent> {
  const res = await fetch(`${BASE_URL}/api/supabase/events/${id}`, {
    ...defaultOptions,
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update event')
  return data.event as SupabaseEvent
}

export async function deleteSupabaseEvent(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/supabase/events/${id}`, {
    ...defaultOptions,
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete event')
  }
}

export async function archivePastEvents(): Promise<{ count: number }> {
  const res = await fetch(`${BASE_URL}/api/supabase/events/archive-past`, {
    ...defaultOptions,
    method: 'POST',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to archive past events')
  return data
}
