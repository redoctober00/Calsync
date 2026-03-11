import { useState, useEffect } from 'react'
import { CALENDARS, getCalendarConfig, type SupabaseEvent, type CreateSupabaseEventPayload } from '@/lib/api'
import { X, Loader2, CalendarDays, Trash2, Clock, AlignLeft } from 'lucide-react'

interface SupabaseEventModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: CreateSupabaseEventPayload) => Promise<void>
  onDelete?: () => Promise<void>
  initialEvent?: SupabaseEvent | null
  defaultDate?: string // YYYY-MM-DD
}

const toLocalInput = (iso?: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SupabaseEventModal({
  open,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  defaultDate,
}: SupabaseEventModalProps) {
  const isEdit = !!initialEvent

  const defaultStart = defaultDate ? `${defaultDate}T09:00` : ''
  const defaultEnd   = defaultDate ? `${defaultDate}T10:00` : ''

  const [form, setForm] = useState<CreateSupabaseEventPayload>({
    title: '',
    description: '',
    start_datetime: defaultStart,
    end_datetime: defaultEnd,
    calendar_type: 'Events',
    color: getCalendarConfig('Events').color,
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialEvent) {
        setForm({
          title: initialEvent.title,
          description: initialEvent.description ?? '',
          start_datetime: toLocalInput(initialEvent.start_datetime),
          end_datetime: toLocalInput(initialEvent.end_datetime),
          calendar_type: initialEvent.calendar_type,
          color: initialEvent.color,
        })
      } else {
        setForm({
          title: '',
          description: '',
          start_datetime: defaultDate ? `${defaultDate}T09:00` : '',
          end_datetime: defaultDate ? `${defaultDate}T10:00` : '',
          calendar_type: 'Events',
          color: getCalendarConfig('Events').color,
        })
      }
      setError(null)
    }
  }, [open, initialEvent, defaultDate])

  if (!open) return null

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'calendar_type') {
      const cal = getCalendarConfig(value)
      setForm((prev) => ({ ...prev, calendar_type: value, color: cal.color }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.start_datetime || !form.end_datetime) {
      setError('Title, start, and end date/time are required.')
      return
    }
    if (new Date(form.end_datetime) <= new Date(form.start_datetime)) {
      setError('End must be after start.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Convert local datetime-local value → ISO
      const payload: CreateSupabaseEventPayload = {
        ...form,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const inputClass = `
    w-full px-3.5 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50
    bg-[hsl(222,47%,8%)] border border-white/[0.08]
    hover:border-white/[0.14] transition-colors duration-200
    focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30
    disabled:opacity-40 disabled:cursor-not-allowed
  `
  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[hsl(222,40%,11%)]
                      shadow-2xl shadow-black/60 overflow-hidden animate-scale-in">
        {/* Top accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-amber-400/15 blur-md" />
              <div className="relative p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <CalendarDays className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-none"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {isEdit ? 'Edit Event' : 'New Event'}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isEdit ? 'Update your calendar event' : 'Add to your calendar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]
                       transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 pb-6 space-y-4" noValidate>
          {/* Title */}
          <div>
            <label className={labelClass}>Event Title <span className="text-amber-400 normal-case">*</span></label>
            <input
              name="title"
              type="text"
              placeholder="Birthday party, Project kickoff…"
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              disabled={loading}
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Calendar */}
          <div>
            <label className={labelClass}>Calendar <span className="text-amber-400 normal-case">*</span></label>
            <div className="relative">
              <select
                name="calendar_type"
                value={form.calendar_type}
                onChange={handleChange}
                disabled={loading}
                className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                style={{
                  colorScheme: 'dark',
                }}
              >
                {CALENDARS.map((cal) => (
                  <option key={cal.id} value={cal.id}>{cal.label}</option>
                ))}
              </select>
              {/* Color dot */}
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                style={{ backgroundColor: getCalendarConfig(form.calendar_type).color }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}><AlignLeft size={11} /> Description</label>
            <textarea
              name="description"
              placeholder="Optional notes…"
              value={form.description}
              onChange={handleChange}
              rows={2}
              disabled={loading}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}><Clock size={11} /> Start <span className="text-amber-400 normal-case">*</span></label>
              <input
                name="start_datetime"
                type="datetime-local"
                value={form.start_datetime}
                onChange={handleChange}
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div>
              <label className={labelClass}><Clock size={11} /> End <span className="text-amber-400 normal-case">*</span></label>
              <input
                name="end_datetime"
                type="datetime-local"
                value={form.end_datetime}
                onChange={handleChange}
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/25 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                           text-destructive hover:bg-destructive/10 border border-destructive/20
                           hover:border-destructive/40 transition-all duration-200
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground
                         hover:text-foreground hover:bg-white/[0.05] border border-white/[0.08]
                         transition-all duration-200 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm
                         bg-amber-400 text-amber-950
                         hover:bg-amber-300 active:scale-[0.99]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-amber-400/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isEdit ? 'Save Changes' : 'Add Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
