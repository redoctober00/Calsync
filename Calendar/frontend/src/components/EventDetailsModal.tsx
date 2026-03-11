import { X, CalendarDays, Clock, MapPin, AlignLeft, ExternalLink, Edit2 } from 'lucide-react'
import type { CalendarEvent, SupabaseEvent } from '@/lib/api'
import { getCalendarConfig } from '@/lib/api'

interface EventDetailsModalProps {
  open: boolean
  onClose: () => void
  event: {
    type: 'google' | 'supabase'
    data: CalendarEvent | SupabaseEvent
  } | null
  onEdit?: (event: SupabaseEvent) => void
}

export default function EventDetailsModal({
  open,
  onClose,
  event,
  onEdit,
}: EventDetailsModalProps) {
  if (!open || !event) return null

  const isSupabase = event.type === 'supabase'
  const data = event.data as any
  
  const title = data.title || 'Untitled Event'
  const description = data.description
  const location = !isSupabase ? data.location : null

  // Date formatting
  const formatDate = (iso?: string, allDayDate?: string) => {
    if (allDayDate) {
      return new Date(allDayDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const startStr = isSupabase 
    ? formatDate(data.start_datetime)
    : formatDate(data.start.dateTime, data.start.date)
  
  const endStr = isSupabase
    ? formatDate(data.end_datetime)
    : formatDate(data.end.dateTime, data.end.date)

  const calendarLabel = isSupabase 
    ? getCalendarConfig(data.calendar_type).label
    : (data.calendarId || 'Google Calendar')

  const color = isSupabase
    ? data.color
    : '#f59e0b'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]
                       shadow-2xl shadow-black/60 overflow-hidden animate-scale-in"
      >
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        {/* Header Section */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md" style={{ backgroundColor: `${color}20` }} />
              <div className="relative p-2 rounded-xl bg-white/5 border border-white/10">
                <CalendarDays className="h-4 w-4" style={{ color }} />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {calendarLabel}
              </h2>
              <p className="text-[10px] text-amber-400/80 mt-1 uppercase tracking-wider font-bold">
                {event.type === 'google' ? 'Remote Sync' : 'Local Event'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.06]
                       active:scale-95 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Body */}
        <div className="px-6 pb-8 space-y-8">
          <div>
            <h1 id="modal-title" className="text-2xl font-bold text-foreground leading-tight tracking-tight">
              {title}
            </h1>
          </div>

          <div className="space-y-5">
            {/* Time Details */}
            <div className="flex items-start gap-4">
              <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-foreground font-semibold leading-relaxed">{startStr}</p>
                {startStr !== endStr && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-px w-3 bg-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{endStr}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            {location && (
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <p className="text-sm text-foreground/90 font-medium leading-relaxed">{location}</p>
              </div>
            )}

            {/* Description Scrollbox */}
            {description && (
              <div className="flex items-start gap-4 pt-2">
                <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-muted-foreground">
                  <AlignLeft className="h-4 w-4" />
                </div>
                <div className="flex-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-2">
            {isSupabase ? (
              <button
                onClick={() => onEdit?.(data)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                           bg-amber-400 text-amber-950
                           hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-400/20
                           active:scale-[0.97]
                           transition-all duration-200"
              >
                <Edit2 size={16} />
                Edit Event
              </button>
            ) : (
              <a
                href={data.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm
                           bg-white/[0.08] text-foreground border border-white/[0.08]
                           hover:bg-white/[0.12] active:scale-[0.97]
                           transition-all duration-200"
              >
                <ExternalLink size={16} />
                Open Google
              </a>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-bold text-muted-foreground
                         hover:text-foreground hover:bg-white/[0.05] border border-white/[0.08]
                         active:scale-[0.97] transition-all duration-200"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
