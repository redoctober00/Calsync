import type { GoogleCalendar } from '@/lib/api'
import { CALENDARS } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface CalendarSidebarProps {
  // Google Calendars
  googleCalendars: GoogleCalendar[]
  googleCalendarsLoading: boolean
  activeGoogleCalendarIds: string[]
  onToggleGoogle: (id: string) => void

  // Supabase local calendars
  activeLocalCalendars: string[]
  onToggleLocal: (id: string) => void
}

export default function CalendarSidebar({
  googleCalendars,
  googleCalendarsLoading,
  activeGoogleCalendarIds,
  onToggleGoogle,
  activeLocalCalendars,
  onToggleLocal,
}: CalendarSidebarProps) {
  return (
    <aside className="w-56 shrink-0 space-y-6">

      {/* ── Google Calendars ── */}
      <div>
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Google Calendars
        </p>

        {googleCalendarsLoading ? (
          <div className="flex items-center gap-2 px-2 py-2 text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {googleCalendars.map((cal) => {
              const active = activeGoogleCalendarIds.includes(cal.id)
              return (
                <li key={cal.id}>
                  <button
                    onClick={() => onToggleGoogle(cal.id)}
                    title={cal.description || cal.summary}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg
                               hover:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-left"
                  >
                    {/* Color swatch / checkbox */}
                    <span
                      className="flex-shrink-0 w-3.5 h-3.5 rounded-sm border-2 transition-all duration-150 flex items-center justify-center"
                      style={{
                        borderColor: cal.backgroundColor,
                        backgroundColor: active ? cal.backgroundColor : 'transparent',
                      }}
                    >
                      {active && (
                        <svg
                          viewBox="0 0 10 10"
                          className="w-2 h-2"
                          fill="none"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          stroke={cal.foregroundColor === '#ffffff' ? 'white' : 'black'}
                        >
                          <polyline points="1.5,5 4,7.5 8.5,2.5" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="text-xs font-medium truncate transition-colors duration-150"
                      style={{
                        color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {cal.summary}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Local Calendars (Supabase) ── */}
      <div>
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          My Calendars
        </p>
        <ul className="space-y-0.5">
          {CALENDARS.map((cal) => {
            const active = activeLocalCalendars.includes(cal.id)
            return (
              <li key={cal.id}>
                <button
                  onClick={() => onToggleLocal(cal.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg
                             hover:bg-white/[0.05] active:scale-[0.97] transition-all duration-150 text-left"
                >
                  <span
                    className="flex-shrink-0 w-3.5 h-3.5 rounded-sm border-2 transition-all duration-150 flex items-center justify-center"
                    style={{
                      borderColor: cal.color,
                      backgroundColor: active ? cal.color : 'transparent',
                    }}
                  >
                    {active && (
                      <svg
                        viewBox="0 0 10 10"
                        className="w-2 h-2"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="1.5,5 4,7.5 8.5,2.5" />
                      </svg>
                    )}
                  </span>
                  <span
                    className="text-xs font-medium truncate transition-colors duration-150"
                    style={{
                      color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {cal.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
