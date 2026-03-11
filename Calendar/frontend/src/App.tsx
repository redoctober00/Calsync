import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  getMe, logout, getUpcomingEvents, getGoogleCalendars,
  createSupabaseEvent, updateSupabaseEvent, deleteSupabaseEvent, archivePastEvents,
  CALENDARS,
  type User, type CalendarEvent, type GoogleCalendar,
  type SupabaseEvent, type CreateSupabaseEventPayload
} from '@/lib/api'
import { LogOut, Calendar, Sparkles, Plus, Clock } from 'lucide-react'
import UpcomingEvents from '@/components/UpcomingEvents'
import CalendarView from '@/components/CalendarView'
import CalendarSidebar from '@/components/CalendarSidebar'
import SupabaseEventModal from '@/components/SupabaseEventModal'
import EventDetailsModal from '@/components/EventDetailsModal'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import { useSupabaseEvents } from '@/hooks/useSupabaseEvents'
import './App.css'


export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [upcomingOpen, setUpcomingOpen] = useState(false)
  const upcomingRef = useRef<HTMLDivElement>(null)

  // Google Calendar list
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([])
  const [googleCalendarsLoading, setGoogleCalendarsLoading] = useState(false)
  // Which Google calendar IDs are currently toggled on
  const [activeGoogleCalendarIds, setActiveGoogleCalendarIds] = useState<string[]>([])
  // Events fetched from active Google calendars
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([])

  // Supabase local calendar toggles
  const [activeLocalCalendars, setActiveLocalCalendars] = useState<string[]>(
    CALENDARS.map((c) => c.id)
  )

  // Supabase events (realtime)
  const { events: supabaseEvents } = useSupabaseEvents()

  // Calendar view month (lifted from CalendarView so App can fetch the right month's events)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [editingEvent, setEditingEvent] = useState<SupabaseEvent | null>(null)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<{ type: 'google' | 'supabase'; data: CalendarEvent | SupabaseEvent } | null>(null)

  // Derive timeMin/timeMax for the currently viewed month (± 1 month buffer)
  const timeMin = new Date(viewYear, viewMonth - 1, 1).toISOString()
  const timeMax = new Date(viewYear, viewMonth + 2, 0, 23, 59, 59).toISOString()

  // Build map: Google calendarId → local calendar type (by matching name, case-insensitive)
  // e.g. Google calendar named "Projects" → 'Projects'
  const googleCalToLocalType = useMemo(() => {
    const map = new Map<string, string>()
    for (const gc of googleCalendars) {
      const match = CALENDARS.find((c) => c.id.toLowerCase() === gc.summary?.toLowerCase())
      if (match) map.set(gc.id, match.id)
    }
    return map
  }, [googleCalendars])

  // ── Fetch Google calendar list once on login ──────────────────────────────
  const loadGoogleCalendars = useCallback(async () => {
    setGoogleCalendarsLoading(true)
    try {
      const cals = await getGoogleCalendars()
      setGoogleCalendars(cals)
      // Start with all calendars active
      setActiveGoogleCalendarIds(cals.map((c) => c.id))
    } catch {
      // ignore — user may not have granted calendar scope yet
    } finally {
      setGoogleCalendarsLoading(false)
    }
  }, [])

  // ── Fetch Google events for the currently viewed month ───────────────────
  const fetchGoogleEvents = useCallback(async (calIds?: string[], tMin?: string, tMax?: string) => {
    try {
      const ids = calIds ?? activeGoogleCalendarIds
      if (ids.length === 0) { setGoogleEvents([]); return }
      const data = await getUpcomingEvents(ids, tMin ?? timeMin, tMax ?? timeMax)
      setGoogleEvents(data)
    } catch {
      // silently ignore
    }
  }, [activeGoogleCalendarIds, timeMin, timeMax])

  useEffect(() => {
    getMe().then((u) => {
      setUser(u)
      setLoadingAuth(false)
      if (u) {
        loadGoogleCalendars()
        archivePastEvents().catch(console.error)
      }
    })
  }, [loadGoogleCalendars])

  // Re-fetch when active calendars change
  useEffect(() => {
    if (activeGoogleCalendarIds.length > 0) fetchGoogleEvents(activeGoogleCalendarIds)
    else setGoogleEvents([])
  }, [activeGoogleCalendarIds, fetchGoogleEvents])

  // Re-fetch when the viewed month changes (covers past months)
  useEffect(() => {
    if (activeGoogleCalendarIds.length > 0) fetchGoogleEvents()
  }, [viewYear, viewMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // 10-second polling for the current view month
  useEffect(() => {
    if (activeGoogleCalendarIds.length === 0) return
    const interval = setInterval(() => fetchGoogleEvents(), 10_000)
    return () => clearInterval(interval)
  }, [activeGoogleCalendarIds, fetchGoogleEvents])


  const handleLogout = async () => {
    await logout()
    setUser(null)
    setGoogleEvents([])
    setGoogleCalendars([])
    setActiveGoogleCalendarIds([])
  }

  const toggleGoogleCalendar = (id: string) => {
    setActiveGoogleCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleLocalCalendar = (id: string) => {
    setActiveLocalCalendars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const openNewEventModal = (dateKey?: string) => {
    setEditingEvent(null)
    setSelectedDate(dateKey)
    setModalOpen(true)
  }

  const openEditModal = (event: SupabaseEvent) => {
    setDetailModalOpen(false)
    setEditingEvent(event)
    setSelectedDate(undefined)
    setModalOpen(true)
  }

  const openDetailModal = (type: 'google' | 'supabase', data: CalendarEvent | SupabaseEvent) => {
    setDetailEvent({ type, data })
    setDetailModalOpen(true)
  }

  const handleSaveSupabaseEvent = async (payload: CreateSupabaseEventPayload) => {
    if (editingEvent) {
      await updateSupabaseEvent(editingEvent.id, payload)
    } else {
      await createSupabaseEvent(payload)
    }
  }

  const handleDeleteSupabaseEvent = async () => {
    if (editingEvent) {
      await deleteSupabaseEvent(editingEvent.id)
    }
  }

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-t-amber-400 border-white/10 animate-spin" />
          <p className="text-sm text-muted-foreground tracking-wider uppercase text-xs">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-amber-400/20 blur-md" />
              <div className="relative p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <Calendar className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground leading-none tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                CalSync
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase leading-none mt-0.5">
                Multi-Calendar
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => openNewEventModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                           bg-amber-400 text-amber-950 hover:bg-amber-300
                           transition-all duration-200 shadow-lg shadow-amber-400/20"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">New Event</span>
              </button>
            )}

            {/* Upcoming Events popover button */}
            {user && (
              <div className="relative" ref={upcomingRef}>
                <button
                  onClick={() => setUpcomingOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                             border transition-all duration-200
                             ${
                               upcomingOpen
                                 ? 'bg-white/[0.08] border-white/[0.15] text-foreground'
                                 : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
                             }`}
                >
                  <Clock size={13} />
                  <span className="hidden sm:inline">Upcoming</span>
                </button>

                {/* Dropdown panel */}
                {upcomingOpen && (
                  <>
                    {/* Click-outside overlay */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUpcomingOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 w-[380px]
                                    rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/95
                                    backdrop-blur-xl shadow-2xl shadow-black/50
                                    animate-scale-in origin-top-right">
                      <UpcomingEvents
                        events={googleEvents}
                        onRefresh={() => fetchGoogleEvents()}
                        onEventClick={(ev) => openDetailModal('google', ev)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {user && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full ring-1 ring-amber-400/30"
                    />
                  )}
                  <div className="leading-tight min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[140px]">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user.email}</p>
                  </div>
                </div>
                <button
                  id="logout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground
                             hover:text-foreground hover:bg-white/[0.06] border border-transparent
                             hover:border-white/[0.08] transition-all duration-200"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {!user ? (
          /* ─── Sign-in screen ─── */
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-sm animate-scale-in">
              <div className="absolute pointer-events-none -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                              w-96 h-96 rounded-full bg-amber-400/5 blur-3xl" />
              <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80 backdrop-blur-xl
                              shadow-2xl shadow-black/50 overflow-hidden">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <div className="px-8 pt-10 pb-4 text-center">
                  <div className="mx-auto mb-5 w-fit relative">
                    <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-lg" />
                    <div className="relative p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                      <Sparkles className="h-8 w-8 text-amber-400" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground leading-tight"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Welcome to CalSync
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Sign in with Google to create and manage your calendar events
                  </p>
                </div>
                <div className="px-8 pb-10 pt-6">
                  <GoogleSignInButton />
                  <p className="mt-4 text-center text-[11px] text-muted-foreground leading-relaxed">
                    CalSync will request access to your Google Calendar to create events on your behalf.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Signed in ─── */
          <div className="flex gap-6 items-start">

            {/* ── Left Sidebar ── */}
            <div className="hidden lg:block animate-slide-up">
              <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80
                              backdrop-blur-xl shadow-xl shadow-black/30 p-4">
                <CalendarSidebar
                  googleCalendars={googleCalendars}
                  googleCalendarsLoading={googleCalendarsLoading}
                  activeGoogleCalendarIds={activeGoogleCalendarIds}
                  onToggleGoogle={toggleGoogleCalendar}
                  activeLocalCalendars={activeLocalCalendars}
                  onToggleLocal={toggleLocalCalendar}
                />
              </div>
            </div>

            {/* ── Center: Calendar Grid ── */}
            <div className="flex-1 min-w-0 space-y-6">
              <div className="animate-slide-up">
                <CalendarView
                  events={googleEvents}
                  googleCalendars={googleCalendars}
                  googleCalToLocalType={googleCalToLocalType}
                  supabaseEvents={supabaseEvents}
                  activeLocalCalendars={activeLocalCalendars}
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  onViewChange={(y, m) => { setViewYear(y); setViewMonth(m) }}
                  onDayClick={openNewEventModal}
                  onEventClick={(ev) => openDetailModal('supabase', ev)}
                  onGoogleEventClick={(ev) => openDetailModal('google', ev)}
                />
              </div>

            </div>
          </div>

        )}
      </main>

      {/* ── Supabase Event Modal ── */}
      <SupabaseEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSupabaseEvent}
        onDelete={editingEvent ? handleDeleteSupabaseEvent : undefined}
        initialEvent={editingEvent}
        defaultDate={selectedDate}
      />

      {/* ── Event Details Modal ── */}
      <EventDetailsModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        event={detailEvent}
        onEdit={openEditModal}
      />
    </div>
  )
}
