import { useState, useEffect, useCallback } from 'react'
import { getUpcomingEvents, type CalendarEvent } from '@/lib/api'
import { Calendar, Clock, MapPin, Loader2, RefreshCw } from 'lucide-react'

const POLL_INTERVAL_MS = 30_000

interface UpcomingEventsProps {
  events?: CalendarEvent[]
  onRefresh?: () => Promise<void>
  refreshTrigger?: number
  onEventClick?: (event: CalendarEvent) => void
}

function formatDateTime(dt?: string, d?: string): string {
  const raw = dt || d
  if (!raw) return 'TBD'
  const date = new Date(raw)
  if (isNaN(date.getTime())) return raw
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: dt ? 'numeric' : undefined,
    minute: dt ? '2-digit' : undefined,
    hour12: true,
  })
}

export default function UpcomingEvents({
  events: propEvents,
  onRefresh,
  refreshTrigger = 0,
  onEventClick,
}: UpcomingEventsProps) {
  const isControlled = propEvents !== undefined

  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(!isControlled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const events = isControlled ? propEvents! : internalEvents

  useEffect(() => {
    if (isControlled) {
      setLoading(false)
      setLastUpdated(new Date())
    }
  }, [propEvents, isControlled])

  const selfFetch = useCallback(async (silent = false) => {
    if (isControlled) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const data = await getUpcomingEvents()
      setInternalEvents(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isControlled])

  useEffect(() => {
    if (!isControlled) selfFetch(false)
  }, [selfFetch, isControlled])

  useEffect(() => {
    if (refreshTrigger > 0) {
      if (isControlled && onRefresh) {
        setRefreshing(true)
        onRefresh().finally(() => setRefreshing(false))
      } else {
        selfFetch(true)
      }
    }
  }, [refreshTrigger, isControlled, onRefresh, selfFetch])

  useEffect(() => {
    if (isControlled) return
    const id = setInterval(() => selfFetch(true), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [selfFetch, isControlled])

  const handleRefreshClick = async () => {
    if (isControlled && onRefresh) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
      setLastUpdated(new Date())
    } else {
      selfFetch(false)
    }
  }

  const isSpinning = loading || refreshing

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]/80
                    backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
      {/* Amber top line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-amber-400/10 blur-md" />
            <div className="relative p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
              <Calendar className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Upcoming Events
            </h3>
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        </div>

        <button
          id="refresh-events-btn"
          onClick={handleRefreshClick}
          disabled={isSpinning}
          title="Refresh events from Google Calendar"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10
                     transition-all duration-200 disabled:opacity-40
                     focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={`h-4 w-4 ${isSpinning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span className="text-sm">Loading events…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-4 text-center text-sm text-destructive">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && events.length === 0 && (
          <div className="py-10 text-center">
            <Calendar className="h-9 w-9 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          </div>
        )}

        {/* Event list */}
        {!loading && !error && events.length > 0 && (
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5" style={{ overscrollBehavior: 'contain' }}>
            {events.map((event) => (
              <li key={event.id}>
                <button
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left block p-3 rounded-xl border border-white/[0.06]
                             hover:border-amber-400/20 hover:bg-amber-400/[0.03]
                             active:scale-[0.98]
                             transition-all duration-200 group"
                  aria-label={`View details for ${event.title}`}
                >
                  {/* Left amber bar + title */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1 w-1 h-4 rounded-full bg-amber-400/30 group-hover:bg-amber-400/70 transition-colors duration-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground group-hover:text-amber-400
                                    transition-colors duration-200 truncate">
                        {event.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock size={10} />
                          {formatDateTime(event.start.dateTime, event.start.date)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[140px]">
                            <MapPin size={10} />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Live sync indicator */}
        <div className="mt-4 flex items-center gap-1.5 justify-end">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wide">Live sync</span>
        </div>
      </div>
    </div>
  )
}
