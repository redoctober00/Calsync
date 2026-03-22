import { useMemo } from 'react'
import type { CalendarEvent, SupabaseEvent, GoogleCalendar } from '@/lib/api'
import { getCalendarConfig } from '@/lib/api'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface CalendarViewProps {
  events: CalendarEvent[]                  // Google Calendar events
  googleCalendars: GoogleCalendar[]        // Full list, used to look up colors
  googleCalToLocalType: Map<string, string> // calendarId → local type (e.g. 'Projects')
  supabaseEvents: SupabaseEvent[]
  activeLocalCalendars: string[]           // Which local calendar types are currently visible
  viewYear: number
  viewMonth: number
  onViewChange: (year: number, month: number) => void
  onDayClick?: (dateKey: string) => void
  onEventClick?: (event: SupabaseEvent) => void
  onGoogleEventClick?: (event: CalendarEvent) => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Unified event shape for the grid
interface DayEvent {
  id: string
  title: string
  pillClass: string   // Tailwind class (Supabase events) — empty when bgColor is set
  bgColor?: string    // Raw hex color (Google events)
  href?: string
  supabaseEvent?: SupabaseEvent
  googleEvent?: CalendarEvent
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function googleEventToDateKey(event: CalendarEvent): string | null {
  if (!event.start.dateTime && event.start.date) return event.start.date
  const raw = event.start.dateTime || event.start.date
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

function supabaseEventToDateKey(event: SupabaseEvent): string | null {
  const d = new Date(event.start_datetime)
  if (isNaN(d.getTime())) return null
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function CalendarView({
  events,
  googleCalendars,
  googleCalToLocalType,
  supabaseEvents,
  activeLocalCalendars,
  viewYear,
  viewMonth,
  onViewChange,
  onDayClick,
  onEventClick,
  onGoogleEventClick,
}: CalendarViewProps) {
  const today = new Date()

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>()
    const add = (key: string, event: DayEvent) => {
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(event)
    }

    const activeLocalSet = new Set(activeLocalCalendars)

    // Build calendarId → backgroundColor for Google events that DON'T map to a local type
    const calColorMap = new Map<string, string>()
    for (const gc of googleCalendars) {
      calColorMap.set(gc.id, gc.backgroundColor)
    }

    // Google events
    for (const ev of events) {
      const key = googleEventToDateKey(ev)
      if (!key || !ev.calendarId) continue

      const localType = googleCalToLocalType.get(ev.calendarId)

      if (localType) {
        // This Google Calendar maps to a local type — apply local color and respect local toggle
        if (!activeLocalSet.has(localType)) continue
        const cal = getCalendarConfig(localType)
        add(key, {
          id: ev.id,
          title: ev.title,
          pillClass: cal.pillClass,
          href: ev.htmlLink,
          googleEvent: ev,
        })
      } else {
        // Un-mapped Google Calendar — show with real Google color
        const bg = calColorMap.get(ev.calendarId) ?? '#f59e0b'
        add(key, {
          id: ev.id,
          title: ev.title,
          pillClass: '',
          bgColor: bg,
          href: ev.htmlLink,
          googleEvent: ev,
        })
      }
    }

    // Supabase events — filtered by activeLocalCalendars
    // (Skip if the event has a google_calendar_id — it's already shown via Google events above)
    for (const ev of supabaseEvents) {
      if (!activeLocalSet.has(ev.calendar_type)) continue
      if (ev.google_calendar_id) continue  // avoid duplicate if mirrored to Google Calendar
      const key = supabaseEventToDateKey(ev)
      if (!key) continue
      const cal = getCalendarConfig(ev.calendar_type)
      add(key, {
        id: ev.id,
        title: ev.title,
        pillClass: cal.pillClass,
        supabaseEvent: ev,
      })
    }

    return map
  }, [events, googleCalendars, googleCalToLocalType, supabaseEvents, activeLocalCalendars])

  const prevMonth = () => {
    if (viewMonth === 0) onViewChange(viewYear - 1, 11)
    else onViewChange(viewYear, viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) onViewChange(viewYear + 1, 0)
    else onViewChange(viewYear, viewMonth + 1)
  }
  const goToday = () => onViewChange(today.getFullYear(), today.getMonth())

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = []

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ year: y, month: m, day: d, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year: viewYear, month: viewMonth, day: d, isCurrentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1
    const y = viewMonth === 11 ? viewYear + 1 : viewYear
    cells.push({ year: y, month: m, day: d, isCurrentMonth: false })
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80
                    backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-lg font-bold text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {MONTH_NAMES[viewMonth]}{' '}
          <span className="text-amber-400">{viewYear}</span>
        </h2>

        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground rounded-lg
                       hover:text-amber-400 hover:bg-amber-400/10 transition-all duration-200
                       focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-white/[0.06] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous month"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-white/[0.06] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next month"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const key = toDateKey(cell.year, cell.month, cell.day)
          const dayEvents = eventsByDay.get(key) ?? []
          const isToday = key === todayKey
          const MAX_VISIBLE = 3

          return (
            <div
              key={idx}
              onClick={() => cell.isCurrentMonth && onDayClick?.(key)}
              className={`
                min-h-[88px] p-1.5 border-b border-r border-white/[0.05]
                transition-colors duration-150 relative group
                ${!cell.isCurrentMonth ? 'bg-white/[0.01]' : 'hover:bg-amber-400/[0.02] cursor-pointer'}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              {/* Date number */}
              <div className="flex justify-end mb-1">
                <span
                  className={`
                    text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    transition-colors duration-150
                    ${isToday
                      ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30'
                      : cell.isCurrentMonth
                        ? 'text-foreground/80'
                        : 'text-muted-foreground/30'
                    }
                  `}
                >
                  {cell.day}
                </span>
              </div>

              {/* Hover add indicator */}
              {cell.isCurrentMonth && onDayClick && (
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Plus size={10} className="text-muted-foreground/40" />
                </div>
              )}

              {/* Event pills */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map((ev) => {
                  if (ev.supabaseEvent) {
                    const config = getCalendarConfig(ev.supabaseEvent.calendar_type)
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(ev.supabaseEvent!)
                        }}
                        className={`
                          block w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium
                          border border-white/10 shadow-sm hover:shadow-md
                          hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] 
                          transition-all duration-150
                          ${ev.pillClass}
                        `}
                        aria-label={`${config.label} event: ${ev.title}`}
                      >
                        {ev.title}
                      </button>
                    )
                  } else {
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (ev.googleEvent) onGoogleEventClick?.(ev.googleEvent)
                        }}
                        className="block w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium
                                   bg-amber-400/10 text-amber-400 border border-amber-400/20
                                   hover:bg-amber-400/20 hover:border-amber-400/30 hover:scale-[1.02]
                                   active:scale-[0.98] transition-all duration-150"
                        aria-label={`Remote event: ${ev.title}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      </button>
                    )
                  }
                })}
                {dayEvents.length > MAX_VISIBLE && (
                  <p className="text-[9px] text-amber-400/70 pl-1 font-medium italic">
                    +{dayEvents.length - MAX_VISIBLE} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
